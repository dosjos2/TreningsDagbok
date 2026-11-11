# Deploy til Azure (enkel, rimelig oppsett for 2 brukere)

Én Azure App Service (Linux) holder. SQLite-databasen ligger på `/home/data`, som er persistent lagring i App Service, så du trenger ingen egen databaseserver.

Kostnad: **F1 (gratis)** fungerer, men appen "sovner" ved inaktivitet (første lasting kan ta noen sekunder) og har CPU-kvote. **B1 (~100–150 kr/mnd)** er raskere og har "Always on". For to brukere er F1 helt OK.

## 0. Forutsetninger
- Azure-konto med abonnement
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az --version`)
- .NET 10 SDK

```powershell
az login
az account set --subscription "<navn eller id>"   # hvis du har flere
```

## 1. Opprett ressurser
Velg et globalt unikt appnavn (blir `https://<appnavn>.azurewebsites.net`).

```powershell
$app = "trening-<dittnavn>"
$rg  = "trening-rg"

az group create -n $rg -l westeurope
az appservice plan create -g $rg -n trening-plan --is-linux --sku F1   # bytt til B1 for Always on
az webapp create -g $rg -p trening-plan -n $app --runtime "DOTNET|10.0"
az webapp update -g $rg -n $app --https-only true
```

Sjekk at runtime finnes: `az webapp list-runtimes --os linux | Select-String dotnet`. Hvis `DOTNET|10.0` ikke er tilgjengelig i regionen ennå, kan du publisere self-contained (se "Feilsøking").

## 2. Google OAuth (innlogging)
1. Gå til https://console.cloud.google.com → opprett (eller velg) et prosjekt.
2. **APIs & Services → OAuth consent screen**: velg *External*, fyll ut appnavn og e-post. Under *Audience/Test users* legg til de to Gmail-adressene som skal bruke appen. (Du trenger ikke å sende appen til verifisering så lenge den står i *Testing* med disse som testbrukere.)
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - *Authorized redirect URIs*: `https://<appnavn>.azurewebsites.net/signin-google`
   - (valgfritt for lokal testing: `http://localhost:5196/signin-google`)
4. Kopier **Client ID** og **Client secret**.

## 3. Sett konfigurasjon i Azure
Hemmelighetene legges som app settings (dobbel underscore = `:` i appsettings.json). Ikke legg dem i git.

```powershell
az webapp config appsettings set -g $rg -n $app --settings `
  "Authentication__Google__ClientId=<client-id>" `
  "Authentication__Google__ClientSecret=<client-secret>" `
  "App__WeeklyGoal=3"
```

`Database:Directory` trenger du ikke sette: på Azure bruker appen automatisk `/home/data`.

## 4. Publiser og deploy
Fra prosjektmappen (`TreningsDagbok`):

```powershell
dotnet publish -c Release -o publish
Compress-Archive -Path publish\* -DestinationPath publish.zip -Force
az webapp deploy -g $rg -n $app --src-path publish.zip --type zip
```

Åpne `https://<appnavn>.azurewebsites.net`, trykk **Logg inn med Google**, og logg inn med en av testbrukerne. Gjør det samme med den andre brukeren, slik at dere finner hverandre via e-post når dere trener sammen.

Nye versjoner: kjør de tre kommandoene over på nytt. Databasen overlever deploy fordi den ligger i `/home/data`.

## 5. Verifiser
```powershell
az webapp log tail -g $rg -n $app          # live logger
curl https://$app.azurewebsites.net/api/me  # skal gi JSON med googleEnabled: true
```

## Valgfritt
- **Automatisk deploy fra GitHub:** `az webapp deployment github-actions add` eller Deployment Center i portalen.
- **Backup av databasen:** last ned `/home/data/trening.db` via Kudu (`https://<appnavn>.scm.azurewebsites.net` → Advanced Tools → Bash/SSH) eller `az webapp ssh`.
- **Eget domene:** Portal → App Service → Custom domains (husk å legge til ny redirect URI i Google).

## Feilsøking
| Problem | Løsning |
|---|---|
| `redirect_uri_mismatch` ved innlogging | Redirect URI i Google må være nøyaktig `https://<appnavn>.azurewebsites.net/signin-google` |
| "Access blocked / app not verified" | Legg brukerens e-post til som *Test user* i OAuth consent screen |
| Knappen "Logg inn med Google" mangler | ClientId/ClientSecret er ikke satt i app settings (start appen på nytt etter endring) |
| `DOTNET\|10.0` ikke støttet | Publiser self-contained: `dotnet publish -c Release -r linux-x64 --self-contained -o publish`, og sett startkommando: `az webapp config set -g $rg -n $app --startup-file "./TreningsDagbok"` |
| Første lasting er treg på F1 | Normalt (kald start). Bytt til B1 og slå på Always on hvis det irriterer |
| Mistet økter | Sjekk at du ikke har satt `Database__Directory` til en ikke-persistent mappe |
