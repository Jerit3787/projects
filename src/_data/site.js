import { loadSite } from '../../lib/load-projects.js';

export default function () {
  return loadSite(process.env.SHOWCASE_CONTENT ?? 'content');
}
