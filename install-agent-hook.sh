#!/bin/sh

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
set -eu
repo_root="$(git rev-parse --show-toplevel)"
sh "$repo_root/check-agent-update.sh"
EOF

chmod +x .git/hooks/pre-commit

echo "Event24 .agent pre-commit hook installed."
