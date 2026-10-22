$api = 'http://localhost:3000/api'

function Test-Api($label, $method, $path, $body, $expected, $token) {
  $content = ''
  $code = 0
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  try {
    $r = Invoke-WebRequest -Method $method -Uri "$api$path" -ContentType 'application/json' -Body $body -Headers $headers -UseBasicParsing
    $code = [int]$r.StatusCode
    $content = $r.Content
  } catch {
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode.value__
      $content = $_.ErrorDetails.Message
    } else {
      $content = $_.Exception.Message
    }
  }
  $json = ($expected -lt 400) -or ($content -like '*"erreur"*')
  if (($code -eq $expected) -and $json) { $status = 'OK   ' } else { $status = 'ECHEC' }
  '{0} {1} (attendu {2}, recu {3})' -f $status, $label, $expected, $code
}

# --- Marches, produits, prix (lecture publique) ---
Test-Api 'Liste des marches'        GET  '/markets'              $null 200
Test-Api 'Produit 999'              GET  '/products/999'         $null 404
Test-Api 'Produit abc'              GET  '/products/abc'         $null 400
Test-Api 'Comparer produit 999'     GET  '/prices/compare/999'   $null 404
Test-Api 'Route inconnue'           GET  '/nimportequoi'         $null 404

# --- Inscription ---
$mail = 'test' + (Get-Random) + '@example.com'
$bodyOk = '{"nom":"Marie Test","email":"' + $mail + '","mot_de_passe":"motdepasse123"}'

Test-Api 'Inscription valide'          POST '/auth/register' $bodyOk 201
Test-Api 'Email deja utilise'          POST '/auth/register' $bodyOk 409
Test-Api 'Inscription nom trop court'  POST '/auth/register' '{"nom":"M","email":"a@example.com","mot_de_passe":"motdepasse123"}' 400
Test-Api 'Inscription email invalide'  POST '/auth/register' '{"nom":"Marie","email":"pas-un-email","mot_de_passe":"motdepasse123"}' 400
Test-Api 'Inscription mdp trop court'  POST '/auth/register' '{"nom":"Marie","email":"b@example.com","mot_de_passe":"court"}' 400
Test-Api 'Inscription sans champs'     POST '/auth/register' '{}' 400

# --- Connexion ---
$loginOk = '{"email":"' + $mail + '","mot_de_passe":"motdepasse123"}'
$loginBad = '{"email":"' + $mail + '","mot_de_passe":"mauvaismotdepasse"}'

Test-Api 'Connexion valide'           POST '/auth/login' $loginOk 200
Test-Api 'Mauvais mot de passe'       POST '/auth/login' $loginBad 401
Test-Api 'Email inconnu'              POST '/auth/login' '{"email":"inconnu@example.com","mot_de_passe":"motdepasse123"}' 401
Test-Api 'Connexion sans champs'      POST '/auth/login' '{}' 400

# --- Routes protegees ---
$token = (Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body $loginOk).token
$tampered = $token.Substring(0, $token.Length - 3) + 'abc'
$prixOk = '{"product_id":3,"market_id":1,"prix":1450}'

Test-Api 'Ajout sans jeton'          POST '/prices' $prixOk 401
Test-Api 'Ajout jeton invalide'      POST '/prices' $prixOk 401 'abc.def.ghi'
Test-Api 'Ajout jeton altere'        POST '/prices' $prixOk 401 $tampered
Test-Api 'Profil sans jeton'         GET  '/auth/me' $null 401
Test-Api 'Profil avec jeton'         GET  '/auth/me' $null 200 $token

Test-Api 'Prix valide'               POST '/prices' $prixOk 201 $token
Test-Api 'Prix a 0'                  POST '/prices' '{"product_id":3,"market_id":1,"prix":0}' 400 $token
Test-Api 'Prix a 1.5'                POST '/prices' '{"product_id":3,"market_id":1,"prix":1.5}' 400 $token
Test-Api 'Produit inconnu'           POST '/prices' '{"product_id":999,"market_id":1,"prix":1000}' 400 $token
Test-Api 'Date dans le futur'        POST '/prices' '{"product_id":3,"market_id":1,"prix":1000,"date_releve":"2030-01-01"}' 400 $token
Test-Api 'Date impossible'           POST '/prices' '{"product_id":3,"market_id":1,"prix":1000,"date_releve":"2026-13-45"}' 400 $token
Test-Api 'JSON casse'                POST '/prices' '{pas du json' 400 $token
# --- Taille du corps ---
$gros = '{"nom":"' + ('a' * 20000) + '"}'
Test-Api 'Corps trop volumineux'     POST '/auth/register' $gros 413


# --- Contenu du jeton (decode localement) ---
try {
  $payload = $token.Split('.')[1].Replace('-', '+').Replace('_', '/')
  switch ($payload.Length % 4) { 2 { $payload += '==' } 3 { $payload += '=' } }
  'Contenu du jeton : ' + [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload))
} catch {
  'Decodage du jeton impossible : ' + $_.Exception.Message
}