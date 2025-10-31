# GitHub Secrets Configuration

## Supabase Secrets

The following secrets are stored securely in GitHub and available to workflows:

- `SUPABASE_URL` - Supabase project URL (already set)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for metrics endpoint authentication
- `SUPABASE_ANON_KEY` - Anon key (for reference/future use)

## Usage

These secrets are available in GitHub Actions workflows via `${{ secrets.SECRET_NAME }}`.

**Note**: These secrets are NOT exposed in logs or publicly. They're encrypted and only available to GitHub Actions workflows.

## Security

⚠️ **Never commit these keys to source code or documentation!**

If you need to use them in a workflow, reference them as:
```yaml
env:
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

