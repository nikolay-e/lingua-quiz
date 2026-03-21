import base from './eslint/base.js';
import typescript from './eslint/typescript.js';
import react from './eslint/react.js';
import boundaries from './eslint/boundaries.js';
import testOverrides from './eslint/test-overrides.js';

export default [...base, ...typescript, ...react, ...boundaries, ...testOverrides];
