$hookPath = ".git/hooks/pre-commit"

$hookContent = @"
#!/bin/sh
set -eu
repo_root="`$(git rev-parse --show-toplevel)"
sh "`$repo_root/check-agent-update.sh"
"@

Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8

Write-Host "Event24 .agent pre-commit hook installed."
