import Script from 'next/script'

const STORAGE_PREFLIGHT_SCRIPT = `
(function () {
  var keyPatterns = [
    /^sb-[a-z0-9]+-auth-token$/i,
    /^supabase\\.auth\\.token$/i,
    /supabase.*auth/i,
    /(^|[-_.])access[-_]?token($|[-_.])/i,
    /(^|[-_.])refresh[-_]?token($|[-_.])/i,
    /(^|[-_.])auth[-_]?token($|[-_.])/i,
    /(^|[-_.])session[-_]?token($|[-_.])/i,
    /(^|[-_.])jwt($|[-_.])/i,
    /novavix.*token/i
  ];
  var valuePatterns = [
    /"access_token"\\s*:/i,
    /"refresh_token"\\s*:/i,
    /"provider_token"\\s*:/i,
    /"provider_refresh_token"\\s*:/i,
    /\\bBearer\\s+[A-Za-z0-9._-]+/i,
    /\\beyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\b/
  ];
  function isSensitive(patterns, value) {
    for (var i = 0; i < patterns.length; i += 1) {
      if (patterns[i].test(value)) return true;
    }
    return false;
  }
  function purge(storage) {
    if (!storage) return;
    var keys = [];
    for (var i = 0; i < storage.length; i += 1) {
      var key = storage.key(i);
      if (!key) continue;
      var value = null;
      try { value = storage.getItem(key); } catch (_) {}
      if (isSensitive(keyPatterns, key) || isSensitive(valuePatterns, value || '')) {
        keys.push(key);
      }
    }
    for (var j = 0; j < keys.length; j += 1) {
      try { storage.removeItem(keys[j]); } catch (_) {}
    }
  }
  try { purge(window.localStorage); } catch (_) {}
  try { purge(window.sessionStorage); } catch (_) {}
})();`

export default function BrowserStoragePreflight(): JSX.Element {
  return (
    <Script
      id="novavix-storage-preflight"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: STORAGE_PREFLIGHT_SCRIPT }}
    />
  )
}
