import { readFileSync, writeFileSync } from 'fs';

const file = 'C:/Users/AAAA/Projects/StudyAI/artifacts/api-server/src/routes/notebook.ts';
let content = readFileSync(file, 'utf8');

const miniPat = 'model: "gpt-4o-mini"';
const gpt4oPat = 'model: "gpt-4o"';

const n1 = content.split(miniPat).length - 1;
const n2 = content.split(gpt4oPat).length - 1;

while (content.includes(miniPat)) content = content.replace(miniPat, 'model: FAST_MODEL');
while (content.includes(gpt4oPat)) content = content.replace(gpt4oPat, 'model: ANALYSIS_MODEL');

writeFileSync(file, content, 'utf8');
console.log(`Replaced gpt-4o-mini: ${n1}, gpt-4o: ${n2}`);
