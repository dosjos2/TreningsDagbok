using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace TreningsDagbok;

public record Exercise(
    string Id, string Name, string Category, string Muscles, int Level, string Equipment,
    int Sets, int Reps, int Seconds, int Rest, bool Unilateral,
    string PoseA, string PoseB, string[] Steps, string Tip);

public record WorkoutItem(string ExerciseId, int Sets, int Reps, int Seconds, int Rest);

public class Workout
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Status { get; set; } = "template"; // template | planned | completed
    public DateTime? PlannedDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int EstimatedSec { get; set; }
    public int ActualSec { get; set; }
    public int? Rpe { get; set; }
    public string? Notes { get; set; }
    public string? TogetherWith { get; set; }
    public string ItemsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class UserProfile
{
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public double? GoalKg { get; set; }
}

public class WeightEntry
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public DateTime Date { get; set; }
    public double Kg { get; set; }
}

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Workout> Workouts => Set<Workout>();
    public DbSet<UserProfile> Profiles => Set<UserProfile>();
    public DbSet<WeightEntry> Weights => Set<WeightEntry>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Workout>().HasIndex(w => new { w.UserId, w.Status });
        b.Entity<UserProfile>().HasKey(p => p.UserId);
        b.Entity<UserProfile>().HasIndex(p => p.Email);
        b.Entity<WeightEntry>().HasIndex(w => new { w.UserId, w.Date }).IsUnique();
    }
}

public static class Calc
{
    public const int TransitionSec = 20;
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static List<WorkoutItem> Parse(string json) =>
        JsonSerializer.Deserialize<List<WorkoutItem>>(json, Json) ?? [];

    public static string Serialize(IEnumerable<WorkoutItem> items) => JsonSerializer.Serialize(items, Json);

    public static int WorkPerSet(WorkoutItem i, Exercise e) =>
        i.Seconds > 0 ? i.Seconds * (e.Unilateral ? 2 : 1) : i.Reps * (e.Unilateral ? 6 : 3);

    public static int ItemSeconds(WorkoutItem i, Exercise e) =>
        i.Sets * WorkPerSet(i, e) + Math.Max(0, i.Sets - 1) * i.Rest;

    public static int Estimate(IReadOnlyList<WorkoutItem> items)
    {
        var total = 0;
        foreach (var i in items)
            if (ExerciseData.ById.TryGetValue(i.ExerciseId, out var e))
                total += ItemSeconds(i, e);
        return total + Math.Max(0, items.Count - 1) * TransitionSec;
    }

    public static List<WorkoutItem> Sanitize(IEnumerable<WorkoutItem>? items) =>
        (items ?? []).Where(i => ExerciseData.ById.ContainsKey(i.ExerciseId)).Take(40)
            .Select(i => new WorkoutItem(i.ExerciseId, Math.Clamp(i.Sets, 1, 10), Math.Clamp(i.Reps, 0, 100),
                Math.Clamp(i.Seconds, 0, 300), Math.Clamp(i.Rest, 0, 300))).ToList();

    public static WorkoutItem Default(Exercise e) => new(e.Id, e.Sets, e.Reps, e.Seconds, e.Rest);

    public static List<WorkoutItem> Generate(int minutes, string focus, string equipment, int level)
    {
        var rnd = Random.Shared;
        var target = Math.Clamp(minutes, 10, 60) * 60;
        var pool = ExerciseData.All.Where(e => e.Level <= level)
            .Where(e => equipment switch { "none" => e.Equipment == "Ingen", "kettlebell" => e.Equipment == "Kettlebell", "dumbbell" => e.Equipment == "Manual", _ => true })
            .Where(e => focus switch
            {
                "lower" => e.Category is "Bein og rumpe" or "Kondisjon",
                "upper" => e.Category is "Overkropp" or "Kjerne",
                "core" => e.Category == "Kjerne",
                "cardio" => e.Category == "Kondisjon",
                _ => true
            }).OrderBy(_ => rnd.Next()).ToList();

        var result = new List<WorkoutItem>();
        // Start med en kondisjonsøvelse som oppvarming når det finnes
        var warm = pool.FirstOrDefault(e => e.Category == "Kondisjon" && e.Level == 1);
        if (warm != null && focus != "core")
        {
            result.Add(new WorkoutItem(warm.Id, 2, warm.Reps, warm.Seconds, Math.Min(warm.Rest, 20)));
            pool.Remove(warm);
        }

        var lastCat = warm?.Category;
        while (pool.Count > 0)
        {
            var next = pool.FirstOrDefault(e => e.Category != lastCat) ?? pool[0];
            pool.Remove(next);
            var placed = false;
            foreach (var sets in new[] { next.Sets, 2 })
            {
                var cand = new WorkoutItem(next.Id, sets, next.Reps, next.Seconds, next.Rest);
                if (Estimate([.. result, cand]) <= target + 90) { result.Add(cand); placed = true; break; }
            }
            if (placed) lastCat = next.Category;
            if (Estimate(result) >= target - 150) break;
        }
        return result;
    }
}
