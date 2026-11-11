(() => {
  const lab = document.querySelector('[data-humid-air]');
  if (!lab) return;
  const controls = ['temperature', 'pressure', 'water'].map(id => lab.querySelector('#humid-' + id));
  const [temperature, pressure, water] = controls;
  const plot = lab.querySelector('svg');
  const summary = lab.querySelector('[data-humid-status]');
  const number = (value, digits = 1) =>
    value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  // Pressures in hPa and mixing ratios in grams per kilogram of dry air.
  const saturationPressure = t => 6.112 * Math.exp(17.62 * t / (243.12 + t));
  const saturationRatio = (t, p) => {
    const es = saturationPressure(t);
    return 622 * es / (p - es);
  };
  const vaporPressure = (r, p) => p * r / (622 + r);
  const dewPoint = e => {
    if (e <= 0) return null;
    const log = Math.log(e / 6.112);
    return 243.12 * log / (17.62 - log);
  };
  const show = (key, value) => { lab.querySelector('[data-humid-value="' + key + '"]').textContent = value; };

  function draw(t, p, total, vapor, threshold) {
    const xmax = 40, ymax = Math.ceil(Math.max(saturationRatio(xmax, p), total) / 20) * 20;
    const x = v => 53 + v / xmax * 422;
    const y = v => 232 - v / ymax * 204;
    const grid = [];
    for (let v = 0; v <= xmax; v += 10) {
      grid.push('<path d="M' + x(v) + ' 28V232"/><text x="' + x(v) + '" y="251">' + v + '</text>');
    }
    for (let v = 0; v <= ymax; v += 20) {
      grid.push('<path d="M53 ' + y(v) + 'H475"/><text x="31" y="' + (y(v) + 4) + '">' + v + '</text>');
    }
    const curve = Array.from({ length: 81 }, (_, i) => {
      const t = i / 2;
      return (i ? 'L' : 'M') + x(t) + ' ' + y(saturationRatio(t, p));
    }).join(' ');
    const dot = (cx, cy, fill) => '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + fill + '" stroke="white" stroke-width="1.5"/>';
    plot.innerHTML =
      '<title id="humid-chart-title">Rapport de mélange à saturation selon la température</title>' +
      '<desc id="humid-chart-desc">Point de l’air à ' + number(t) + ' degrés, avec ' + number(vapor, 2) +
      ' grammes de vapeur par kilogramme d’air sec. La ligne en tirets représente la quantité totale d’eau introduite.</desc>' +
      '<g class="humid-grid">' + grid.join('') + '</g>' +
      '<path d="M53 28V232H475" fill="none" stroke="#607888"/>' +
      '<path d="' + curve + '" fill="none" stroke="#126c91" stroke-width="3"/>' +
      '<path d="M53 ' + y(total) + 'H475" fill="none" stroke="#9a5700" stroke-width="2" stroke-dasharray="7 5"/>' +
      (threshold !== null && threshold >= 0 && threshold <= xmax ? dot(x(threshold), y(total), '#9a5700') : '') +
      dot(x(t), y(vapor), '#245b3d') +
      '<text x="264" y="272" text-anchor="middle">Température (°C)</text><text x="55" y="18">Eau (g/kg d’air sec)</text>';
  }

  function render() {
    const [t, p, total] = controls.map(control => control.valueAsNumber);
    lab.querySelector('output[for="humid-temperature"]').value = number(t) + ' °C';
    lab.querySelector('output[for="humid-pressure"]').value = number(p, 0) + ' hPa';
    lab.querySelector('output[for="humid-water"]').value = number(total) + ' g/kg';
    const capacity = saturationRatio(t, p);
    const vapor = Math.min(total, capacity);
    const condensate = Math.max(0, total - capacity);
    const rh = 100 * vaporPressure(vapor, p) / saturationPressure(t);
    const dew = dewPoint(vaporPressure(vapor, p));
    const threshold = dewPoint(vaporPressure(total, p));
    show('rh', number(Math.min(100, rh)) + ' %');
    show('dew', dew === null ? 'Air sec' : dew < -45 ? '< −45 °C' : number(dew) + ' °C');
    show('vapor', number(vapor, 2) + ' g/kg');
    show('liquid', number(condensate, 2) + ' g/kg');
    if (condensate > 0.0001) {
      summary.textContent = 'De l’eau se condense. La vapeur restante est à saturation et son point de rosée est la température actuelle.';
    } else if (total === 0) {
      summary.textContent = 'Air sec dans ce modèle. Il n’y a aucune vapeur d’eau à condenser.';
    } else if (threshold >= 0) {
      summary.textContent = 'En refroidissant à pression constante, la condensation débute à ' + number(threshold) + ' °C.';
    } else {
      summary.textContent = 'La saturation n’est pas atteinte entre 0 et 40 °C pour cette quantité d’eau.';
    }
    draw(t, p, total, vapor, threshold);
  }

  controls.forEach(control => control.addEventListener('input', render));
  lab.querySelectorAll('[data-humid-preset]').forEach(button => {
    button.addEventListener('click', () => {
      temperature.value = button.dataset.humidPreset;
      pressure.value = 1013;
      water.value = 6.4;
      render();
    });
  });
  render();
})();
