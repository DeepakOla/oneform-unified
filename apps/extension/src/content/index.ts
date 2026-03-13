import '../styles/globals.css';

// Legacy OneForm dependencies executed sequentially
import './fieldMappers.ts';
import './portalMappings.ts';
import '../vault/vault.ts';

import './contentScript.ts';

console.log('OneForm Extension Content Script Loaded with Legacy Modules.');
