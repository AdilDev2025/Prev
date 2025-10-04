import jsonfile from 'jsonfile';
import moment from 'moment';
import simpleGit from 'simple-git';
import random from 'random';

const Path = './data.json';
const git = simpleGit();

const makeCommit = async (n, total) => {
    if (n === 0) {
        console.log("Pushing commits to GitHub...");
        await git.push('origin', 'main'); // Change to 'master' if needed
        console.log("Push completed!");
        return;
    }

    // Full 2024–2025 range
    const start = moment("2024-01-01");
    const end = moment("2025-12-31");

    const date = moment(random.int(start.unix(), end.unix()), "X")
        .add(random.int(0, 23), 'hours')
        .format();

    const data = { date };
    const count = total - n + 1;

    console.log(`Commit #${count}/${total} → date: ${date}`);

    jsonfile.writeFile(Path, data, async () => {
        await git.add([Path]);
        await git.commit(`Commit #${count}`, { '--date': date });
        makeCommit(n - 1, total);
    });
};

makeCommit(1000, 1000); // Adjust number of commits if needed
