import * as os from 'os';
import {Metadata} from '../types';

// tslint:disable:no-var-requires
const packageJson = require('../../../package.json');

const metadata: Metadata = {
    getHostname: () => os.hostname(),
    getOsVersion: () => `${os.platform()} ${os.arch()} ${os.release()}`,
    getToolVersion: () => packageJson.version,
    getUptime: () => process.uptime()
};

export default metadata;