
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);
const W = canvas.width;
const H = canvas.height;

let state = "menu";
let players = [];
let bullets = [];
let enemies = [];
let enemyBullets = [];
let items = [];
let stars = [];
let keys = {};

let score = 0;
let phase = 1;
let kills = 0;
let boss = null;
let spawnTimer = 0;
let frame = 0;
let mode = 1;
let audio;

// ESTRELAS DO ESPAÇO
for (let i = 0; i < 110; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: 1 + Math.random() * 3,
    size: 1 + Math.random() * 2
  });
}

// SONS GERADOS PELO NAVEGADOR
function sound(freq = 400, duration = 0.1, type = "square") {
  try {
    audio ||= new (window.AudioContext ||
      window.webkitAudioContext)();

    if (audio.state === "suspended") audio.resume();

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001, audio.currentTime + duration
    );

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch (error) {
    // O jogo continua mesmo se o áudio não estiver disponível.
  }
}

// CRIAR JOGADORES
function createPlayer(number) {
  return {
    number,
    x: number === 1 ? W * 0.35 : W * 0.65,
    y: H - 70,
    w: 30,
    h: 36,
    speed: 4,
    hp: 3,
    weapon: 1,
    rapid: 0,
    shield: 0,
    cooldown: 0,
    invincible: 0,
    alive: true,
    color: number === 1 ? "#56f4ff" : "#ff63ad"
  };
}

// INICIAR JOGO
function startGame(playerCount) {
  mode = playerCount;
  players = [createPlayer(1)];

  if (mode === 2) {
    players.push(createPlayer(2));
  }

  bullets = [];
  enemies = [];
  enemyBullets = [];
  items = [];
  score = 0;
  phase = 1;
  kills = 0;
  boss = null;
  spawnTimer = 0;
  frame = 0;
  state = "playing";

  $("menu").hidden = true;
  $("end").hidden = true;
  $("p2status").hidden = mode !== 2;

  updateHUD();
  sound(500, 0.15, "sine");
}

// PAINEL DE INFORMAÇÕES
function updateHUD() {
  $("phase").textContent = phase;
  $("score").textContent = score;
  $("hp1").textContent = players[0]?.hp ?? 3;
  $("hp2").textContent = players[1]?.hp ?? 3;
}

// FINALIZAR PARTIDA
function finishGame(victory) {
  state = "end";
  $("end").hidden = false;
  $("endTitle").textContent =
    victory ? "VOCÊ VENCEU! 🏆" : "FIM DE JOGO";

  $("endMessage").textContent =
    `Pontuação final: ${score}`;

  sound(victory ? 700 : 120, 0.4,
    victory ? "sine" : "sawtooth");
}

// COLISÕES
function hit(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

// EXPLOSÕES
function explosion(x, y, color) {
  for (let i = 0; i < 18; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 25,
      color
    });
  }
}

let particles = [];

// ATIRAR
function shoot(p) {
  if (!p.alive || p.cooldown > 0) return;

  p.cooldown = p.rapid > 0 ? 7 : 16;

  const offsets = p.weapon >= 3
    ? [-10, 0, 10]
    : p.weapon === 2 ? [-7, 7] : [0];

  for (const offset of offsets) {
    bullets.push({
      x: p.x + p.w / 2 - 3 + offset,
      y: p.y,
      w: 6,
      h: 13,
      speed: 9,
      owner: p.number,
      color: p.color
    });
  }

  sound(550, 0.06);
}

// CRIAR INIMIGOS
function spawnEnemy() {
  const fast = Math.random() < 0.3;

  enemies.push({
    x: 25 + Math.random() * (W - 55),
    y: -35,
    w: fast ? 23 : 32,
    h: fast ? 23 : 30,
    hp: fast ? 1 : 2,
    speed: (fast ? 2.8 : 1.4) + phase * 0.25,
    dead: false
  });
}

// CRIAR CHEFÃO
function spawnBoss() {
  const health = 35 + phase * 15;

  boss = {
    x: W / 2 - 65,
    y: 45,
    w: 130,
    h: 75,
    hp: health,
    maxHP: health,
    speed: 2 + phase * 0.15,
    direction: 1,
    cooldown: 0
  };

  sound(100, 0.6, "sawtooth");
}

// ITENS DE MELHORIA
function dropItem(x, y) {
  if (Math.random() > 0.25) return;

  const types = ["double", "rapid", "shield"];

  items.push({
    x, y, w: 20, h: 20,
    type: types[Math.floor(Math.random() * types.length)],
    dead: false
  });
}

// RECEBER DANO
function damagePlayer(p) {
  if (!p.alive || p.invincible > 0 || p.shield > 0) {
    return;
  }

  p.hp--;
  p.invincible = 70;
  sound(150, 0.2, "sawtooth");

  if (p.hp <= 0) {
    p.alive = false;

    if (players.every(player => !player.alive)) {
      finishGame(false);
    }
  }

  updateHUD();
}

// VENCER CHEFÃO E AVANÇAR DE FASE
function defeatBoss() {
  score += 250 + phase * 50;
  boss = null;
  enemyBullets = [];
  enemies = [];
  items = [];
  kills = 0;

  sound(700, 0.5, "sine");

  phase++;

  if (phase > 5) {
    updateHUD();
    finishGame(true);
    return;
  }

  // Recompensa por vencer a fase
  players.forEach(p => {
    if (p.alive) {
      p.hp = Math.min(3, p.hp + 1);
      p.weapon = Math.min(3, p.weapon + 1);
      p.shield = 100;
    }
  });

  spawnTimer = 0;
  updateHUD();
}

// ATUALIZAR JOGO
function update() {
  frame++;

  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > H) {
      s.y = 0;
      s.x = Math.random() * W;
    }
  });

  // JOGADORES
  players.forEach((p, index) => {
    if (!p.alive) return;

    p.cooldown = Math.max(0, p.cooldown - 1);
    p.invincible = Math.max(0, p.invincible - 1);
    p.rapid = Math.max(0, p.rapid - 1);
    p.shield = Math.max(0, p.shield - 1);

    if (index === 0) {
      if (keys.a) p.x -= p.speed;
      if (keys.d) p.x += p.speed;
      if (keys.w) p.y -= p.speed;
      if (keys.s) p.y += p.speed;
      if (keys[" "]) shoot(p);
    } else {
      if (keys.arrowleft) p.x -= p.speed;
      if (keys.arrowright) p.x += p.speed;
      if (keys.arrowup) p.y -= p.speed;
      if (keys.arrowdown) p.y += p.speed;
      if (keys.enter) shoot(p);
    }

    p.x = Math.max(0, Math.min(W - p.w, p.x));
    p.y = Math.max(120, Math.min(H - p.h, p.y));
  });

  // FASES: CADA FASE TEM UM CHEFÃO
  if (!boss) {
    spawnTimer++;

    if (kills >= 8 + phase * 2) {
      spawnBoss();
    } else if (spawnTimer > Math.max(20, 55 - phase * 4)) {
      spawnEnemy();
      spawnTimer = 0;
    }
  }

  // MOVIMENTO DOS INIMIGOS
  enemies.forEach(e => {
    e.y += e.speed;
    e.x += Math.sin(frame * 0.04) * 0.7;

    if (e.y > H) {
      e.dead = true;
      const p = players.find(q => q.alive);
      if (p) damagePlayer(p);
    }
  });

  // MOVIMENTO DO CHEFÃO E SEUS ATAQUES
  if (boss) {
    boss.x += boss.speed * boss.direction;

    if (boss.x < 10 || boss.x + boss.w > W - 10) {
      boss.direction *= -1;
    }

    boss.cooldown--;

    if (boss.cooldown <= 0) {
      enemyBullets.push({
        x: boss.x + boss.w / 2,
        y: boss.y + boss.h,
        w: 10,
        h: 15,
        vx: (Math.random() - 0.5) * 4,
        vy: 3 + phase * 0.35
      });

      boss.cooldown = Math.max(15, 45 - phase * 4);
    }
  }

  // TIROS DOS JOGADORES
  bullets.forEach(b => {
    b.y -= b.speed;

    enemies.forEach(e => {
      if (!e.dead && hit(b, e)) {
        e.hp--;
        b.dead = true;

        if (e.hp <= 0) {
          e.dead = true;
          score += 10;
          kills++;
          dropItem(e.x, e.y);
          explosion(e.x, e.y, "#ff5da8");
        }
      }
    });

    if (boss && hit(b, boss)) {
      boss.hp--;
      b.dead = true;

      if (boss.hp <= 0) defeatBoss();
    }
  });

  // TIROS DOS INIMIGOS
  enemyBullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;

    players.forEach(p => {
      if (p.alive && hit(b, p)) {
        b.dead = true;
        damagePlayer(p);
      }
    });
  });

  // COLETAR MELHORIAS
  items.forEach(it => {
    it.y += 2;

    players.forEach(p => {
      if (p.alive && hit(it, p)) {
        it.dead = true;

        if (it.type === "double") {
          p.weapon = Math.min(3, p.weapon + 1);
        }

        if (it.type === "rapid") {
          p.rapid = 500;
        }

        if (it.type === "shield") {
          p.shield = 350;
        }

        score += 5;
        sound(800, 0.15, "sine");
      }
    });
  });

  bullets = bullets.filter(b => !b.dead && b.y > -20);
  enemies = enemies.filter(e => !e.dead && e.y < H + 40);
  enemyBullets = enemyBullets.filter(b =>
    !b.dead && b.y < H + 30
  );
  items = items.filter(i => !i.dead && i.y < H + 20);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });

  particles = particles.filter(p => p.life > 0);

  updateHUD();
}

// DESENHAR NAVES
function drawShip(p) {
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);

  ctx.shadowBlur = 16;
  ctx.shadowColor = p.color;
  ctx.fillStyle = p.color;

  ctx.beginPath();
  ctx.moveTo(0, -p.h / 2);
  ctx.lineTo(p.w / 2, p.h / 2);
  ctx.lineTo(0, p.h / 2 - 8);
  ctx.lineTo(-p.w / 2, p.h / 2);
  ctx.closePath();
  ctx.fill();

  if (p.shield > 0) {
    ctx.strokeStyle = "#7aff9b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// DESENHAR TELA
function draw() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#05091c");
  gradient.addColorStop(1, "#11163c");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  stars.forEach(s => {
    ctx.fillStyle = "#d4f8ff";
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  enemies.forEach(e => {
    ctx.fillStyle = "#ff426f";
    ctx.shadowColor = "#ff426f";
    ctx.shadowBlur = 12;
    ctx.fillRect(e.x, e.y, e.w, e.h);
  });

  ctx.shadowBlur = 0;

  // CHEFÃO E BARRA DE VIDA
  if (boss) {
    ctx.fillStyle = "#711d58";
    ctx.fillRect(boss.x, boss.y, boss.w, boss.h);

    ctx.fillStyle = "#ff4cbb";
    ctx.fillRect(boss.x + 15, boss.y + 20, boss.w - 30, 15);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boss.x + 35, boss.y + 24, 12, 6);
    ctx.fillRect(boss.x + 83, boss.y + 24, 12, 6);

    ctx.fillStyle = "#38152e";
    ctx.fillRect(W / 2 - 125, 15, 250, 12);

    ctx.fillStyle = "#ff4cbb";
    ctx.fillRect(
      W / 2 - 125, 15,
      250 * Math.max(0, boss.hp / boss.maxHP), 12
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CHEFÃO", W / 2, 42);
  }

  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  enemyBullets.forEach(b => {
    ctx.fillStyle = "#ff4c62";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  items.forEach(it => {
    ctx.fillStyle =
      it.type === "double" ? "#56f4ff" :
      it.type === "rapid" ? "#ffe477" : "#7aff9b";

    ctx.fillRect(it.x, it.y, it.w, it.h);
  });

  players.forEach(p => {
    if (p.alive &&
        (p.invincible === 0 || frame % 8 < 4)) {
      drawShip(p);
    }
  });

  particles.forEach(p => {
    ctx.globalAlpha = Math.min(1, p.life / 15);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  });

  ctx.globalAlpha = 1;
}

// LOOP PRINCIPAL
function loop() {
  if (state === "playing") update();
  draw();
  requestAnimationFrame(loop);
}

// BOTÕES DO MENU
$("solo").addEventListener("click", () => startGame(1));
$("duo").addEventListener("click", () => startGame(2));

$("retry").addEventListener("click", () => startGame(mode));

$("back").addEventListener("click", () => {
  state = "menu";
  $("end").hidden = true;
  $("menu").hidden = false;
});

// TECLADO
document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([
    " ", "arrowup", "arrowdown",
    "arrowleft", "arrowright", "enter"
  ].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;
});

document.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  keys = {};
});

loop();
