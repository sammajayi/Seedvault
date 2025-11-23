/**
 * Fix localStorage entries that may cause JSON parsing errors
 * This fixes issues where embedded wallets library expects JSON but gets plain strings
 */
export function fixLocalStorageEntries() {
  if (typeof window === 'undefined') return;

  try {
    // Check all localStorage keys for problematic values
    const allKeys = Object.keys(localStorage);
    
    for (const key of allKeys) {
      try {
        const value = localStorage.getItem(key);
        if (!value || value === 'null' || value === 'undefined') continue;

        // Try to parse as JSON to see if it's already valid
        try {
          JSON.parse(value);
          // If it parses successfully, it's valid JSON, leave it alone
          continue;
        } catch {
          // If parsing fails, it might be a plain string that needs fixing
        }

        // Check if value is a plain string (not starting with { or [)
        // and not already a quoted JSON string
        if (
          typeof value === 'string' && 
          !value.startsWith('{') && 
          !value.startsWith('[') &&
          !value.startsWith('"') &&
          value.trim() !== ''
        ) {
          // Special handling for "onboardingcomplete" - this is the specific error case
          if (value === 'onboardingcomplete') {
            // Remove the problematic entry - let the library recreate it properly
            // OR convert it to a proper JSON value
            // Since we don't know what the library expects, we'll remove it
            localStorage.removeItem(key);
            console.log(`Removed problematic localStorage key "${key}" with value "${value}"`);
          } else if (value === 'true' || value === 'false') {
            // Keep boolean strings as-is (they're valid JSON)
            continue;
          } else {
            // For other plain strings, wrap in JSON string
            const jsonValue = JSON.stringify(value);
            localStorage.setItem(key, jsonValue);
            console.log(`Fixed localStorage key "${key}": converted plain string to JSON`);
          }
        }
      } catch (keyError) {
        // Skip this key if there's an error
        console.warn(`Error processing localStorage key "${key}":`, keyError);
      }
    }
  } catch (error) {
    console.warn('Error fixing localStorage entries:', error);
  }
}

/**
 * Run fix immediately on script load (for synchronous execution)
 * This ensures it runs before any other scripts try to access localStorage
 */
if (typeof window !== 'undefined') {
  // Run immediately
  fixLocalStorageEntries();
  
  // Also run on DOMContentLoaded as a backup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLocalStorageEntries);
  } else {
    // DOM already loaded, run immediately
    fixLocalStorageEntries();
  }
}

