const fs = require('fs');
const vm = require('vm');
const zlib = require('zlib');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('assets/js/app.js', 'utf8');
const notes = fs.readFileSync('assets/js/community-notes.js', 'utf8');

const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
const dataScripts = Array.from({ length: 6 }, (_, index) => `assets/data/professors-${String(index + 1).padStart(2, '0')}.js`);
const expectedScripts = [...dataScripts, 'assets/js/app.js', 'assets/js/community-notes.js', 'assets/js/reviews.js', 'assets/js/loader.js'];
assert.deepEqual(scripts, expectedScripts, 'index.html runtime script allowlist drifted');

assert(!html.includes('id="course"'), 'course filter returned to public UI');
assert(!html.includes('id="compareModal"'), 'professor-by-course comparison returned to public UI');
assert(!html.includes('precisionFilters'), 'advanced evidence filters returned to public UI');
assert(html.includes('امتیاز کلی'), 'professor-level rating copy is missing');
assert(app.includes('function professorStats(professor)'), 'professor-level aggregation is missing');
assert(app.includes('const professorRating = professor => professorStats(professor).score'), 'professor score accessor is missing');
assert(app.includes('const reports = professor => professorStats(professor).sampleSize'), 'displayed review count is not tied to score-contributing evidence');
assert(app.includes('...professor.courses.map(course => course.course)'), 'course names are missing from professor search');
assert(!app.includes('data-compare-id'), 'comparison controls still exist in app runtime');
assert(!app.includes('matchingCourses('), 'public runtime still contains course matching logic');

new vm.Script(app, { filename: 'assets/js/app.js' });
new vm.Script(notes, { filename: 'assets/js/community-notes.js' });
new vm.Script(fs.readFileSync('assets/js/reviews.js', 'utf8'), { filename: 'assets/js/reviews.js' });
assert(notes.includes('qualitative summaries') || notes.includes('خلاصهٔ تجربه‌های دانشجویی'), 'qualitative summary module is missing');
assert(notes.includes('روی امتیاز عددی استاد اثر نمی‌گذارد'), 'qualitative notes do not state score separation');
assert(!/\bin reply to\b/i.test(notes), 'raw chat reply markers leaked into qualitative notes');
assert(!/\[\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/.test(notes), 'raw chat timestamps leaked into qualitative notes');

const context = { window: {} };
context.window = context;
vm.createContext(context);
for (const relative of dataScripts) vm.runInContext(fs.readFileSync(relative, 'utf8'), context, { filename: relative });
const encoded = context.__UI_DB_GZ_PARTS.join('');
const pack = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));

assert.equal(pack.s.professors, 743, 'embedded professor statistic changed');
assert.equal(pack.p.length, 743, 'official professor roster is not 743 rows');
assert.equal(new Set(pack.p.map(row => row[1])).size, 743, 'canonical professor names are not unique');
assert.equal(new Set(pack.p.map(row => row[3]).filter(Boolean)).size, 17, 'faculty count changed');
assert.equal(new Set(pack.p.map(row => row[4]).filter(Boolean)).size, 61, 'department label count changed');

function validScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5;
}
function professorStats(row) {
  let total = 0;
  let sampleSize = 0;
  for (const course of row[7]) {
    const count = Number(course[1]) || 0;
    const score = course[2];
    if (count > 0 && validScore(score)) {
      total += score * count;
      sampleSize += count;
    }
  }
  return { score: sampleSize ? total / sampleSize : null, sampleSize };
}

const stats = pack.p.map(professorStats);
const ratings = stats.map(value => value.score).filter(value => value !== null);
assert(ratings.length > 0 && ratings.length < 743, 'professor score coverage is implausible');
assert(ratings.every(validScore), 'professor-level aggregation produced a score outside 0–5');
assert(stats.every(value => Number.isInteger(value.sampleSize) && value.sampleSize >= 0), 'score-contributing review count is invalid');
const withThree = stats.filter(value => value.sampleSize >= 3).length;
assert(withThree > 0, 'no professors have three or more score-contributing reviews');

console.log(JSON.stringify({
  passed: 20,
  professors: pack.p.length,
  ratedProfessors: ratings.length,
  professorsWithThreeScoreContributingReviews: withThree,
  runtimeScripts: scripts,
}, null, 2));
