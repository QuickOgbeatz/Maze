const WIDTH = 38;
const HEIGHT = 17;
const FOG_RADIUS = 3;

// -------- HELPER FUNCTIONS --------
function formatTime(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msLeft = Math.floor(ms % 1000);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(msLeft).padStart(3,'0')}`;
}

// Leaderboard: array of {name, time}
function loadLeaderboard() {
    return JSON.parse(localStorage.getItem("mazeLeaderboard") || "[]");
}

function saveToLeaderboard(name, time) {
    const scores = loadLeaderboard();
    scores.push({name: name || "Anonymous", time});
    scores.sort((a,b) => a.time - b.time);
    localStorage.setItem("mazeLeaderboard", JSON.stringify(scores.slice(0,5)));
}

function renderLeaderboard() {
    const list = document.getElementById("leaderboard");
    const scores = loadLeaderboard();
    list.innerHTML = "";

    scores.forEach((entry,i) => {
        const li = document.createElement("li");
        li.textContent = `#${i+1} — ${entry.name} — ${formatTime(entry.time)}`;
        list.appendChild(li);
    });

    if (scores.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No runs yet";
        list.appendChild(li);
    }
}

// -------- MAZE GENERATION (PRIM'S) --------
function generateMaze() {
    const maze = Array.from({ length: HEIGHT + 2 },
        () => Array(WIDTH + 2).fill(1));

    maze[1][1] = 0;
    let walls = [[1,1]];

    while (walls.length) {
        const [x,y] = walls.splice(Math.floor(Math.random()*walls.length),1)[0];
        [[2,0],[-2,0],[0,2],[0,-2]].forEach(([dx,dy]) => {
            const nx = x+dx, ny = y+dy;
            if (nx>0 && ny>0 && nx<=WIDTH && ny<=HEIGHT && maze[ny][nx]===1) {
                maze[y+dy/2][x+dx/2] = 0;
                maze[ny][nx] = 0;
                walls.push([nx,ny]);
            }
        });
    }

    maze[HEIGHT][WIDTH] = 0; // exit
    return maze;
}

// -------- ENTITY --------
class Entity {
    constructor(x,y) { this.x=x; this.y=y; }
    move(dx,dy,maze) {
        if (maze[this.y+dy][this.x+dx] === 0) {
            this.x += dx;
            this.y += dy;
        }
    }
}

// -------- RENDERER --------
class Renderer {
    draw(entity, maze, seen) {
        let out = "╔" + "═".repeat(WIDTH) + "╗\n";

        for (let y=1;y<=HEIGHT;y++) {
            let line="║";
            for (let x=1;x<=WIDTH;x++) {
                if (!seen[y][x]) line += `<span class="fog">█</span>`;
                else if (entity.x===x && entity.y===y) line += `<span class="player">●</span>`;
                else if (x===WIDTH && y===HEIGHT) line += `<span class="exit">X</span>`;
                else if (maze[y][x]===1) line += `<span class="wall">█</span>`;
                else line += " ";
            }
            line += "║\n";
            out += line;
        }
        out += "╚" + "═".repeat(WIDTH) + "╝";
        document.getElementById("screen").innerHTML = out;
    }
}

// -------- GAME --------
class Game {
    constructor() {
        this.maze = generateMaze();
        this.entity = new Entity(1,1);
        this.seen = Array.from({length: HEIGHT+2}, ()=>Array(WIDTH+2).fill(false));
        this.renderer = new Renderer();
        this.startTime = performance.now();
        this.running = true;

        document.addEventListener("keydown", e => this.input(e.key));
        renderLeaderboard();
        this.loop();
    }

    reveal() {
        for (let dy=-FOG_RADIUS; dy<=FOG_RADIUS; dy++)
            for (let dx=-FOG_RADIUS; dx<=FOG_RADIUS; dx++) {
                const yy = this.entity.y + dy;
                const xx = this.entity.x + dx;
                if (this.seen[yy]) this.seen[yy][xx] = true;
            }
    }

    input(key) {
        if (!this.running) return;

        const map = {
            ArrowUp:[0,-1], ArrowDown:[0,1],
            ArrowLeft:[-1,0], ArrowRight:[1,0],
            w:[0,-1], s:[0,1], a:[-1,0], d:[1,0]
        };
        if (map[key]) {
            this.entity.move(...map[key], this.maze);
            this.reveal();

            // WIN
            if (this.entity.x===WIDTH && this.entity.y===HEIGHT) {
                this.running = false;
                const finalTime = performance.now() - this.startTime;
                const name = prompt("Congratulations! Enter your name for the leaderboard:", "Anonymous");
                saveToLeaderboard(name, finalTime);
                renderLeaderboard();
            }
        }
    }

    loop() {
        this.reveal();
        this.renderer.draw(this.entity, this.maze, this.seen);

        const t = performance.now() - this.startTime;
        document.getElementById("timer").textContent =
            `Time: ${String(Math.floor(t/60000)).padStart(2,'0')}:${String(Math.floor(t/1000)%60).padStart(2,'0')}.${String(Math.floor(t%1000)).padStart(3,'0')}`;

        if (this.running) requestAnimationFrame(() => this.loop());
    }
}

new Game();
