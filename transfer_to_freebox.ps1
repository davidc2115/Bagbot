# Script PowerShell pour transférer les correctifs vers la Freebox
# À exécuter depuis votre PC Windows

Write-Host "📦 Transfert des correctifs vers la Freebox" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$FREEBOX_IP = "88.174.155.230"
$FREEBOX_PORT = "33000"
$FREEBOX_USER = "bagbot"
$FREEBOX_PASS = "bagbot"
$FREEBOX_PATH = "/home/bagbot/BagBot"  # ⚠️ AJUSTEZ ce chemin si nécessaire

# Vérifier que SCP est disponible
$scpAvailable = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpAvailable) {
    Write-Host "❌ SCP n'est pas disponible sur ce système" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions :" -ForegroundColor Yellow
    Write-Host "  1. Installez OpenSSH Client (Windows 10/11)"
    Write-Host "  2. Ou utilisez WinSCP (interface graphique)"
    Write-Host "  3. Ou utilisez le script Bash sous WSL"
    Write-Host ""
    exit 1
}

Write-Host "✓ SCP trouvé" -ForegroundColor Green

# Note : PowerShell ne supporte pas facilement l'authentification par mot de passe SSH
# Il faudra entrer le mot de passe manuellement pour chaque fichier

Write-Host ""
Write-Host "⚠️  IMPORTANT : Vous devrez entrer le mot de passe pour chaque fichier" -ForegroundColor Yellow
Write-Host "    Mot de passe : $FREEBOX_PASS" -ForegroundColor Yellow
Write-Host ""
Write-Host "Appuyez sur une touche pour continuer ou Ctrl+C pour annuler..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Liste des fichiers à transférer
$files = @(
    @{Local="src/bot.js"; Remote="$FREEBOX_PATH/src/bot.js"},
    @{Local="src/storage/jsonStore.js"; Remote="$FREEBOX_PATH/src/storage/jsonStore.js"},
    @{Local="deploy_counting_fix.sh"; Remote="$FREEBOX_PATH/deploy_counting_fix.sh"},
    @{Local="CORRECTIFS_COMPTAGE_03JAN2026.md"; Remote="$FREEBOX_PATH/CORRECTIFS_COMPTAGE_03JAN2026.md"},
    @{Local="ANALYSE_BUGS_COMPTAGE_03JAN2026.md"; Remote="$FREEBOX_PATH/ANALYSE_BUGS_COMPTAGE_03JAN2026.md"},
    @{Local="GUIDE_DEPLOIEMENT_FREEBOX.md"; Remote="$FREEBOX_PATH/GUIDE_DEPLOIEMENT_FREEBOX.md"},
    @{Local="RESUME_FINAL_CORRECTIFS.md"; Remote="$FREEBOX_PATH/RESUME_FINAL_CORRECTIFS.md"}
)

Write-Host ""
Write-Host "📤 Transfert des fichiers..." -ForegroundColor Cyan
Write-Host ""

$success = 0
$failed = 0

foreach ($file in $files) {
    $localPath = $file.Local
    $remotePath = $file.Remote
    
    if (-not (Test-Path $localPath)) {
        Write-Host "  ⚠️  $localPath - Non trouvé (ignoré)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "  • $(Split-Path $localPath -Leaf)... " -NoNewline
    
    $scpCmd = "scp -P $FREEBOX_PORT `"$localPath`" `"${FREEBOX_USER}@${FREEBOX_IP}:${remotePath}`""
    
    try {
        $result = Invoke-Expression $scpCmd 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓" -ForegroundColor Green
            $success++
        } else {
            Write-Host "✗" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "✗" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "✓ Transfert terminé : $success fichier(s) transféré(s)" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Prochaine étape : Exécuter le script de déploiement sur la Freebox" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Connectez-vous à la Freebox :" -ForegroundColor Yellow
    Write-Host "  ssh -p $FREEBOX_PORT ${FREEBOX_USER}@${FREEBOX_IP}" -ForegroundColor White
    Write-Host ""
    Write-Host "Puis exécutez :" -ForegroundColor Yellow
    Write-Host "  cd $FREEBOX_PATH" -ForegroundColor White
    Write-Host "  chmod +x deploy_counting_fix.sh" -ForegroundColor White
    Write-Host "  ./deploy_counting_fix.sh" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  Transfert partiel : $success OK, $failed échec(s)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "❌ Certains fichiers n'ont pas été transférés" -ForegroundColor Red
    Write-Host "   Réessayez ou utilisez WinSCP pour un transfert manuel." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour quitter..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
