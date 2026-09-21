/* keycrack — deduce a four-symbol key from unordered feedback. */
(function () {
  "use strict";
  var GLYPHS = ["0","1","3","7","9","A","C","F"];
  var LEN = 4, TRIES = 8;

  var $ = function (i) { return document.getElementById(i); };
  var log = $("log"), cur = $("current"), pad = $("pad"), overlay = $("overlay"), card = $("card");
  var vLeft = $("v-left"), vScore = $("v-score"), vBest = $("v-best"), vLock = $("v-lock"), submit = $("submit");

  function load(k,d){try{var v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}}
  function save(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  var best = parseInt(load("kc.best","0"),10) || 0;
  vBest.textContent = best;

  var lock = 1, score = 0, key = [], guess = [], left = TRIES, pool = [], playing = false;

  function poolSize() { return Math.min(GLYPHS.length, 5 + lock); }

  function newLock() {
    pool = GLYPHS.slice(0, poolSize());
    var bag = pool.slice();
    key = [];
    for (var i = 0; i < LEN; i++) key.push(bag.splice((Math.random() * bag.length) | 0, 1)[0]);
    guess = []; left = TRIES;
    log.innerHTML = "";
    drawPad(); drawCurrent(); hud();
  }

  function hud() {
    vLeft.textContent = left;
    vScore.textContent = score;
    vLock.textContent = "lock " + lock;
    submit.disabled = guess.length !== LEN || !playing;
  }

  function drawPad() {
    pad.innerHTML = "";
    pool.forEach(function (g) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = g;
      b.className = guess.indexOf(g) >= 0 ? "used" : "";
      b.addEventListener("click", function () { put(g); });
      pad.appendChild(b);
    });
  }

  function drawCurrent() {
    cur.innerHTML = "";
    for (var i = 0; i < LEN; i++) {
      var s = document.createElement("div");
      s.className = "slot" + (i === guess.length ? " on" : "");
      s.textContent = guess[i] || "";
      cur.appendChild(s);
    }
    drawPad(); hud();
  }

  function put(g) {
    if (!playing || guess.length >= LEN || guess.indexOf(g) >= 0) return;
    guess.push(g); drawCurrent();
  }
  function back() { if (!playing) return; guess.pop(); drawCurrent(); }

  function judge(g) {
    var exact = 0, near = 0;
    for (var i = 0; i < LEN; i++) {
      if (g[i] === key[i]) exact++;
      else if (key.indexOf(g[i]) >= 0) near++;
    }
    return { exact: exact, near: near };
  }

  function addRow(g, r, n) {
    var row = document.createElement("div");
    row.className = "row";
    var html = '<span class="n">' + n + "</span>";
    g.forEach(function (c) { html += '<div class="slot">' + c + "</div>"; });
    html += '<span class="pips">';
    for (var i = 0; i < r.exact; i++) html += '<b class="pip exact"></b>';
    for (var j = 0; j < r.near; j++) html += '<b class="pip near"></b>';
    for (var k = r.exact + r.near; k < LEN; k++) html += '<b class="pip"></b>';
    html += "</span>";
    row.innerHTML = html;
    log.appendChild(row);
  }

  function tryKey() {
    if (!playing || guess.length !== LEN) return;
    var g = guess.slice(), r = judge(g);
    left--;
    addRow(g, r, TRIES - left);
    guess = []; drawCurrent();
    if (r.exact === LEN) return cracked(left);
    if (left === 0) return busted();
    hud();
  }

  function cracked(rem) {
    playing = false;
    var gain = 150 + rem * 120 + lock * 60;
    score += gain;
    if (score > best) { best = score; save("kc.best", String(best)); vBest.textContent = best; }
    hud();
    card.innerHTML = '<h1 class="good">lock ' + lock + " open</h1>" +
      "<p>Key was <span class=\"key\">" + key.join("") + "</span></p>" +
      '<div class="score-rows"><div><span>attempts spared</span><b>+' + rem * 120 + "</b></div>" +
      "<div><span>lock bonus</span><b>+" + (150 + lock * 60) + "</b></div>" +
      "<div><span>score</span><b>" + score + "</b></div></div>" +
      '<button class="btn" id="go" type="button">Next lock</button>';
    overlay.hidden = false;
    $("go").addEventListener("click", function () { lock++; newLock(); play(); }, { once: true });
  }

  function busted() {
    playing = false; hud();
    card.innerHTML = '<h1 class="bad">locked out</h1>' +
      "<p>The key was <span class=\"key\">" + key.join("") + "</span></p>" +
      '<div class="score-rows"><div><span>locks cracked</span><b>' + (lock - 1) + "</b></div>" +
      "<div><span>score</span><b>" + score + "</b></div>" +
      "<div><span>best</span><b>" + best + "</b></div></div>" +
      '<button class="btn" id="go" type="button">Try again</button>';
    overlay.hidden = false;
    $("go").addEventListener("click", function () { lock = 1; score = 0; newLock(); play(); }, { once: true });
  }

  function play() { overlay.hidden = true; playing = true; hud(); }

  cur.addEventListener("click", back);
  $("back").addEventListener("click", back);
  submit.addEventListener("click", tryKey);
  document.addEventListener("keydown", function (e) {
    if (!playing) return;
    if (e.key === "Backspace") { e.preventDefault(); back(); return; }
    if (e.key === "Enter") { e.preventDefault(); tryKey(); return; }
    var c = e.key.toUpperCase();
    if (pool.indexOf(c) >= 0) { e.preventDefault(); put(c); }
  });

  newLock();
  $("go").addEventListener("click", play, { once: true });
})();
