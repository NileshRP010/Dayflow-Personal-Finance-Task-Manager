$ErrorActionPreference = 'Stop'

$javaHome = 'C:\Program Files\Java\jdk-17'
$maven = Join-Path $PSScriptRoot '..\..\.tools\apache-maven-3.10.0\bin\mvn.cmd'
if (-not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
    throw "JDK 17 was not found at $javaHome. Update javaHome in this script to your JDK 17 folder."
}
if (-not (Test-Path $maven)) {
    throw 'The project Maven runtime is missing. Reopen the project setup before starting the API.'
}

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"
$env:DB_USER = Read-Host 'MySQL username (press Enter for dayflow)'
if ([string]::IsNullOrWhiteSpace($env:DB_USER)) { $env:DB_USER = 'dayflow' }
$env:DB_URL = 'jdbc:mysql://localhost:3306/dayflow?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'

$securePassword = Read-Host 'MySQL password (input stays hidden)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Push-Location $PSScriptRoot
    try {
        & $maven '-Dmaven.repo.local=../../.maven-cache/repository' 'spring-boot:run'
        if ($LASTEXITCODE -ne 0) { throw "The Dayflow API stopped with exit code $LASTEXITCODE." }
    } finally {
        Pop-Location
    }
} finally {
    $env:DB_PASSWORD = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
}
