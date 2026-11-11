using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using TreningsDagbok;

var builder = WebApplication.CreateBuilder(args);

var dbDir = builder.Configuration["Database:Directory"];
if (string.IsNullOrWhiteSpace(dbDir))
    dbDir = Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME") != null
        ? Path.Combine(Environment.GetEnvironmentVariable("HOME") ?? ".", "data")
        : Path.Combine(builder.Environment.ContentRootPath, "App_Data");
var weeklyGoal = Math.Clamp(builder.Configuration.GetValue("App:WeeklyGoal", 3), 1, 14);
Directory.CreateDirectory(dbDir);
builder.Services.AddDbContext<AppDb>(o => o.UseSqlite($"Data Source={Path.Combine(dbDir, "trening.db")}"));

var googleId = builder.Configuration["Authentication:Google:ClientId"];
var googleSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var googleEnabled = !string.IsNullOrWhiteSpace(googleId) && !string.IsNullOrWhiteSpace(googleSecret);

var auth = builder.Services.AddAuthentication(o =>
{
    o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
}).AddCookie(o =>
{
    o.Cookie.Name = "trening.auth";
    o.ExpireTimeSpan = TimeSpan.FromDays(60);
    o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
if (googleEnabled)
{
    auth.AddGoogle(GoogleDefaults.AuthenticationScheme, o =>
    {
        o.ClientId = googleId!;
        o.ClientSecret = googleSecret!;
        o.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        o.SaveTokens = false;
    });
}
builder.Services.AddAuthorization();
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDb>().Database.EnsureCreated();

app.UseForwardedHeaders();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

string? Uid(ClaimsPrincipal u) => u.FindFirstValue(ClaimTypes.NameIdentifier);

// ---------- Innlogging ----------
app.MapGet("/auth/login", () =>
    googleEnabled
        ? Results.Challenge(new AuthenticationProperties { RedirectUri = "/#/dagbok" }, [GoogleDefaults.AuthenticationScheme])
        : Results.Redirect("/#/dagbok"));

app.MapGet("/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Redirect("/");
});

if (app.Environment.IsDevelopment())
{
    app.MapGet("/auth/dev-login", async (HttpContext ctx, int? user) =>
    {
        var n = user == 2 ? "2" : "";
        var id = new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, "dev-user" + n), new Claim(ClaimTypes.Name, "Utvikler" + n),
            new Claim(ClaimTypes.Email, $"dev{n}@example.com")],
            CookieAuthenticationDefaults.AuthenticationScheme);
        await ctx.SignInAsync(new ClaimsPrincipal(id));
        return Results.Redirect("/#/dagbok");
    });
}

app.MapGet("/api/me", async (ClaimsPrincipal u, AppDb db) =>
{
    var authed = u.Identity?.IsAuthenticated == true;
    if (authed)
    {
        var uid = Uid(u)!;
        var name = u.FindFirstValue(ClaimTypes.Name) ?? "Bruker";
        var email = (u.FindFirstValue(ClaimTypes.Email) ?? "").ToLowerInvariant();
        var p = await db.Profiles.FindAsync(uid);
        if (p == null) db.Profiles.Add(new UserProfile { UserId = uid, Name = name, Email = email });
        else { p.Name = name; p.Email = email; }
        await db.SaveChangesAsync();
    }
    return new
    {
        authenticated = authed,
        name = u.FindFirstValue(ClaimTypes.Name),
        googleEnabled,
        devLogin = app.Environment.IsDevelopment()
    };
});

// ---------- Kropsvekt ----------
app.MapGet("/api/weight", async (ClaimsPrincipal u, AppDb db) =>
{
    var uid = Uid(u)!;
    var entries = await db.Weights.Where(w => w.UserId == uid).ToListAsync();
    var goal = (await db.Profiles.FindAsync(uid))?.GoalKg;
    return new
    {
        goalKg = goal,
        entries = entries.OrderBy(w => w.Date).Select(w => new { w.Id, date = w.Date.ToString("yyyy-MM-dd"), w.Kg })
    };
}).RequireAuthorization();

app.MapPost("/api/weight", async (ClaimsPrincipal u, AppDb db, WeightInput i) =>
{
    var uid = Uid(u)!;
    if (i.Kg is < 20 or > 400) return Results.BadRequest("Ugyldig vekt.");
    var date = i.Date?.Date ?? DateTime.Today;
    var kg = Math.Round(i.Kg, 1);
    var e = await db.Weights.FirstOrDefaultAsync(w => w.UserId == uid && w.Date == date);
    if (e == null) db.Weights.Add(new WeightEntry { UserId = uid, Date = date, Kg = kg });
    else e.Kg = kg;
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

app.MapDelete("/api/weight/{id:int}", async (int id, ClaimsPrincipal u, AppDb db) =>
{
    var uid = Uid(u)!;
    var e = await db.Weights.FirstOrDefaultAsync(w => w.Id == id && w.UserId == uid);
    if (e == null) return Results.NotFound();
    db.Weights.Remove(e);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.MapPut("/api/weight/goal", async (ClaimsPrincipal u, AppDb db, GoalInput i) =>
{
    var uid = Uid(u)!;
    if (i.GoalKg is < 20 or > 400) return Results.BadRequest("Ugyldig vektmål.");
    var p = await db.Profiles.FindAsync(uid);
    if (p == null) return Results.NotFound();
    p.GoalKg = i.GoalKg == null ? null : Math.Round(i.GoalKg.Value, 1);
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

// ---------- Treningspartner ----------
app.MapGet("/api/users/lookup", async (ClaimsPrincipal u, AppDb db, string email) =>
{
    var uid = Uid(u)!;
    var e = (email ?? "").Trim().ToLowerInvariant();
    if (e.Length < 3) return Results.NotFound();
    var p = await db.Profiles.FirstOrDefaultAsync(x => x.Email == e && x.UserId != uid);
    return p == null ? Results.NotFound() : Results.Ok(new { id = p.UserId, name = p.Name, email = p.Email });
}).RequireAuthorization();

// ---------- Øvelsesbibliotek (offentlig) ----------
app.MapGet("/api/exercises", () => ExerciseData.All);

app.MapPost("/api/generate", (GenerateRequest r) =>
{
    var items = Calc.Generate(r.Minutes, r.Focus ?? "full", r.Equipment ?? "both", Math.Clamp(r.Level, 1, 3));
    return new { items, estimatedSec = Calc.Estimate(items) };
});

// ---------- Økter (krever innlogging) ----------
var api = app.MapGroup("/api/workouts").RequireAuthorization();

object Dto(Workout w) => new
{
    w.Id, w.Name, w.Status, w.PlannedDate, w.CompletedAt, w.EstimatedSec, w.ActualSec, w.Rpe, w.Notes, w.TogetherWith,
    items = Calc.Parse(w.ItemsJson)
};

api.MapGet("/", async (ClaimsPrincipal u, AppDb db) =>
{
    var uid = Uid(u)!;
    var list = await db.Workouts.Where(w => w.UserId == uid).ToListAsync();
    return list.OrderByDescending(w => w.CompletedAt ?? w.PlannedDate ?? w.CreatedAt).Select(Dto);
});

api.MapPost("/", async (ClaimsPrincipal u, AppDb db, WorkoutInput input) =>
{
    var uid = Uid(u)!;
    var status = input.Status is "planned" or "completed" ? input.Status : "template";
    var items = Calc.Sanitize(input.Items);
    if (items.Count == 0) return Results.BadRequest("Økten må inneholde minst én øvelse.");

    Workout w;
    if (input.Id is int id)
    {
        var existing = await db.Workouts.FirstOrDefaultAsync(x => x.Id == id && x.UserId == uid);
        if (existing == null) return Results.NotFound();
        w = existing;
    }
    else
    {
        w = new Workout { UserId = uid };
        db.Workouts.Add(w);
    }

    var name = input.Name?.Trim();
    w.Name = string.IsNullOrEmpty(name) ? "Treningsøkt" : name[..Math.Min(name.Length, 80)];
    w.Status = status;
    w.ItemsJson = Calc.Serialize(items);
    w.EstimatedSec = Calc.Estimate(items);
    w.PlannedDate = status == "planned" ? input.PlannedDate?.Date : null;
    if (status == "completed")
    {
        w.CompletedAt = input.CompletedAt ?? DateTime.Now;
        w.ActualSec = Math.Clamp(input.ActualSec ?? w.EstimatedSec, 0, 6 * 3600);
        w.Rpe = input.Rpe is >= 1 and <= 10 ? input.Rpe : null;
        w.Notes = input.Notes?.Trim() is { Length: > 0 } n ? n[..Math.Min(n.Length, 1000)] : null;
    }
    await db.SaveChangesAsync();

    if (status == "completed" && input.Id is null && input.PartnerIds is { Count: > 0 })
    {
        var ids = input.PartnerIds.Distinct().Where(p => p != uid).Take(5).ToList();
        var partners = await db.Profiles.Where(p => ids.Contains(p.UserId)).ToListAsync();
        if (partners.Count > 0)
        {
            var me = await db.Profiles.FindAsync(uid);
            w.TogetherWith = string.Join(", ", partners.Select(p => p.Name));
            foreach (var p in partners)
                db.Workouts.Add(new Workout
                {
                    UserId = p.UserId, Name = w.Name, Status = "completed", ItemsJson = w.ItemsJson,
                    EstimatedSec = w.EstimatedSec, CompletedAt = w.CompletedAt, ActualSec = w.ActualSec,
                    TogetherWith = string.Join(", ", new[] { me?.Name }.Concat(partners.Where(x => x != p).Select(x => x.Name)).Where(s => s != null))
                });
            await db.SaveChangesAsync();
        }
    }
    return Results.Ok(Dto(w));
});

api.MapDelete("/{id:int}", async (int id, ClaimsPrincipal u, AppDb db) =>
{
    var uid = Uid(u)!;
    var w = await db.Workouts.FirstOrDefaultAsync(x => x.Id == id && x.UserId == uid);
    if (w == null) return Results.NotFound();
    db.Workouts.Remove(w);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapGet("/api/stats", async (ClaimsPrincipal u, AppDb db, string? today) =>
{
    var uid = Uid(u)!;
    var now = DateTime.TryParse(today, out var t) ? t.Date : DateTime.Today;
    var done = (await db.Workouts.Where(w => w.UserId == uid && w.Status == "completed").ToListAsync())
        .Where(w => w.CompletedAt != null).ToList();

    static DateTime WeekStart(DateTime d) => d.Date.AddDays(-(((int)d.DayOfWeek + 6) % 7));
    var thisWeek = WeekStart(now);

    var exStats = done.SelectMany(w => Calc.Parse(w.ItemsJson)).Where(i => ExerciseData.ById.ContainsKey(i.ExerciseId)).ToList();
    var totalSets = exStats.Sum(i => i.Sets);
    var totalReps = exStats.Where(i => i.Seconds == 0).Sum(i =>
        i.Sets * i.Reps * (ExerciseData.ById[i.ExerciseId].Unilateral ? 2 : 1));
    var totalHold = exStats.Where(i => i.Seconds > 0).Sum(i => i.Sets * i.Seconds);

    var weekCounts = done.GroupBy(w => WeekStart(w.CompletedAt!.Value)).ToDictionary(g => g.Key, g => g.ToList());
    // Ukerekke: sammenhengende uker med minst én økt; inneværende uke brekker ikke rekken før den er over
    int streak = 0, best = 0, run = 0;
    foreach (var wk in weekCounts.Keys.OrderBy(k => k))
    {
        run = weekCounts.ContainsKey(wk.AddDays(-7)) ? run + 1 : 1;
        best = Math.Max(best, run);
    }
    var cursor = weekCounts.ContainsKey(thisWeek) ? thisWeek : thisWeek.AddDays(-7);
    while (weekCounts.ContainsKey(cursor)) { streak++; cursor = cursor.AddDays(-7); }

    var weekly = Enumerable.Range(0, 8).Select(i => thisWeek.AddDays(-7 * (7 - i))).Select(ws => new
    {
        weekStart = ws,
        count = weekCounts.TryGetValue(ws, out var l) ? l.Count : 0,
        minutes = weekCounts.TryGetValue(ws, out var l2) ? (int)Math.Round(l2.Sum(x => x.ActualSec) / 60.0) : 0
    });

    var heat = done.GroupBy(w => w.CompletedAt!.Value.Date).ToDictionary(g => g.Key, g => (int)Math.Round(g.Sum(x => x.ActualSec) / 60.0));
    var heatmap = Enumerable.Range(0, 84).Select(i => now.AddDays(i - 83))
        .Select(d => new { date = d.ToString("yyyy-MM-dd"), minutes = heat.GetValueOrDefault(d) });

    var thisWeekList = weekCounts.GetValueOrDefault(thisWeek) ?? [];
    var rpes = done.Where(w => w.Rpe != null).Select(w => w.Rpe!.Value).ToList();
    var weekdays = new int[7];
    foreach (var w in done) weekdays[((int)w.CompletedAt!.Value.DayOfWeek + 6) % 7]++;

    return new
    {
        workouts = done.Count,
        totalMinutes = (int)Math.Round(done.Sum(w => w.ActualSec) / 60.0),
        avgMinutes = done.Count == 0 ? 0 : (int)Math.Round(done.Average(w => w.ActualSec) / 60.0),
        longestMinutes = done.Count == 0 ? 0 : (int)Math.Round(done.Max(w => w.ActualSec) / 60.0),
        totalSets, totalReps, totalHoldSeconds = totalHold,
        last30 = done.Count(w => w.CompletedAt!.Value.Date > now.AddDays(-30)),
        weekGoal = weeklyGoal,
        thisWeek = new { count = thisWeekList.Count, minutes = (int)Math.Round(thisWeekList.Sum(x => x.ActualSec) / 60.0) },
        streakWeeks = streak,
        bestStreakWeeks = best,
        avgRpe = rpes.Count == 0 ? (double?)null : Math.Round(rpes.Average(), 1),
        weekly,
        weekdays,
        categories = exStats.GroupBy(i => ExerciseData.ById[i.ExerciseId].Category)
            .Select(g => new { name = g.Key, sets = g.Sum(i => i.Sets) }).OrderByDescending(x => x.sets),
        topExercises = exStats.GroupBy(i => i.ExerciseId)
            .Select(g => new { name = ExerciseData.ById[g.Key].Name, sets = g.Sum(i => i.Sets) })
            .OrderByDescending(x => x.sets).Take(5),
        heatmap
    };
}).RequireAuthorization();

app.Run();

record GenerateRequest(int Minutes, string? Focus, string? Equipment, int Level);

record WorkoutInput(int? Id, string? Name, string? Status, DateTime? PlannedDate, DateTime? CompletedAt,
    int? ActualSec, int? Rpe, string? Notes, List<WorkoutItem>? Items, List<string>? PartnerIds);

record WeightInput(DateTime? Date, double Kg);

record GoalInput(double? GoalKg);
