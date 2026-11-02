/* Gemeinsame stellengerechte Schreibweise für alle Aufgabenhilfen. */
(function (root) {
  "use strict";
  function bracketModel(expression, mode, count = 1) {
    const tokens = expression.match(/\([^()]+\)|\d+|[+−]/g);
    const groups = tokens.map((t, i) => t.startsWith("(") ? i : -1).filter(i => i >= 0);
    const source = groups.length ? tokens : [tokens.slice(0, 3).join(" "), ...tokens.slice(3)];
    const targets = groups.length ? groups : [0];
    const rows = [{cells: ["", ...source]}];
    let current = [...source];
    const limit = mode === "setup" ? 0 : Math.min(mode === "partial" ? 1 : count, targets.length);
    for (let j = 0; j < limit; j++) {
      const index = targets[j];
      const m = source[index].match(/(\d+) ([+−]) (\d+)/);
      const value = m[2] === "+" ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
      current = current.map((text, i) => i === index ? (mode === "partial" ? String(value) : "□") : text);
      rows.push({cells: ["=", ...current], changed: [index + 1]});
    }
    return {kind: "brackets", caption: "Eine Rechnung pro Zeile · alles andere unverändert übernehmen", widths: [2, ...source.map(t => Math.max(t.length + 2, 3))], rows};
  }
  function columnModel(expression, kind, mode, column = 0) {
    const [first, , second] = expression.split(" ");
    const a = Number(first), b = Number(second), subtract = kind === "subtract";
    const length = Math.max(first.length, second.length) + (subtract ? 0 : 1);
    const top = Array.from({length}, (_, i) => Math.floor(a / 10 ** i) % 10);
    const bottom = Array.from({length}, (_, i) => i < second.length ? Math.floor(b / 10 ** i) % 10 : "");
    const revised = [...top], carries = Array(length).fill("");
    const result = Array.from({length}, (_, i) => !subtract && i >= Math.max(first.length, second.length) ? "" : "□");
    const last = Math.min(column, Math.max(first.length, second.length) - 1);
    if (mode !== "setup") {
      let carry = 0;
      for (let i = 0; i <= last; i++) {
        const y = Number(bottom[i]);
        if (subtract && revised[i] < y) {
          let donor = i + 1;
          while (donor < length && revised[donor] === 0) donor++;
          if (donor >= length) throw new Error("Entbündeln ist nicht möglich");
          revised[donor]--;
          for (let k = donor - 1; k > i; k--) revised[k] = 9;
          revised[i] += 10;
        } else if (!subtract) {
          const sum = top[i] + y + carry;
          carry = Math.floor(sum / 10);
          if (carry && i + 1 < length) carries[i + 1] = i < last || mode === "partial" ? String(carry) : "□";
        }
      }
      if (mode === "partial") result[0] = String(subtract ? revised[0] - Number(bottom[0]) : (top[0] + Number(bottom[0])) % 10);
    }
    const changed = top.map((value, i) => revised[i] !== value);
    const display = (values, digits) => [...values].reverse().map((value, i) => length - i > digits ? "" : String(value));
    const rows = [{role: "places", cells: ["", ...Array.from({length}, (_, i) => ["E", "Z", "H", "T", "ZT", "HT"][length - 1 - i])]}];
    if (subtract && changed.some(Boolean)) rows.push({role: "unbundled", cells: ["", ...[...revised].reverse().map((value, i) => changed[length - 1 - i] ? String(value) : "")]});
    rows.push({cells: ["", ...display(top, first.length)], crossed: [false, ...[...changed].reverse()]});
    rows.push({cells: [subtract ? "−" : "+", ...display(bottom, second.length)]});
    if (!subtract) rows.push({role: "carry", cells: ["", ...carries.reverse()]});
    rows.push({role: "result", cells: ["", ...result.reverse()]});
    return {kind, caption: subtract ? "Stellengerecht · veränderte Stellen beim Entbündeln oben notieren" : "Stellengerecht · Überträge über dem Ergebnisstrich notieren", widths: Array(length + 1).fill(3.5), rows, original: a, revised};
  }
  function model(task, part, mode, stepIndex = 1) {
    if (task.kind === "add" || task.kind === "subtract") return columnModel(part.expression, task.kind, mode, Math.max(0, stepIndex - 1));
    if (task.kind === "brackets") return bracketModel(part.expression, mode, Math.max(1, stepIndex));
    if (task.kind === "laws") {
      if (mode === "setup") return bracketModel(part.expression, "setup");
      const pair = part.start.match(/Schau dir (\d+) und (\d+)/);
      const rest = part.expression.split(" + ");
      rest.splice(rest.indexOf(pair[1]), 1); rest.splice(rest.indexOf(pair[2]), 1);
      return bracketModel([`(${pair[1]} + ${pair[2]})`, ...rest].join(" + "), mode);
    }
    return null;
  }
  function append(host, task, part, mode, stepIndex) {
    const layout = model(task, part, mode, stepIndex);
    if (!layout) return;
    const wrapper = document.createElement("div"); wrapper.className = "notation-scroll";
    const table = document.createElement("table"); table.className = "task-notation notation-" + layout.kind;
    table.style.width = layout.widths.reduce((sum, width) => sum + width, 0) + "ch";
    const caption = document.createElement("caption"); caption.textContent = layout.caption;
    const cols = document.createElement("colgroup");
    layout.widths.forEach(width => {const col = document.createElement("col"); col.style.width = width + "ch"; cols.append(col);});
    const body = document.createElement("tbody");
    layout.rows.forEach(row => {
      const tr = document.createElement("tr"); if (row.role) tr.className = "notation-" + row.role;
      row.cells.forEach((value, index) => {
        const cell = document.createElement(row.role === "places" ? "th" : "td");
        if (row.role === "places") cell.scope = "col";
        if (row.changed?.includes(index)) cell.className = "notation-replaced";
        if (row.crossed?.[index]) {const struck = document.createElement("s"); struck.textContent = value; cell.append(struck);}
        else cell.textContent = value;
        tr.append(cell);
      });
      body.append(tr);
    });
    table.append(caption, cols, body); wrapper.append(table); host.append(wrapper);
  }
  const api = {model, append};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.taskNotation = api;
})(typeof window !== "undefined" ? window : globalThis);
