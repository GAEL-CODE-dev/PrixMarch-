$api = 'http://localhost:3000/api'
$codes = @()
$last = ''

foreach ($i in 1..12) {
  try {
    Invoke-WebRequest -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body '{"email":"inconnu@example.com","mot_de_passe":"mauvais"}' -UseBasicParsing | Out-Null
    $codes += 200
  } catch {
    $codes += [int]$_.Exception.Response.StatusCode.value__
    $last = $_.ErrorDetails.Message
  }
}

'Codes : ' + ($codes -join ' ')
'Derniere reponse : ' + $last