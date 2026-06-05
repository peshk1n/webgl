"use strict";

// ── App state (shared globally) ──────────────────────────────────────────────

var appState = {
    bloom:      { enabled: true,  intensity: 1.0,  threshold: 0.70 },
    vignette:   { enabled: true,  intensity: 0.70 },
    grain:      { enabled: true,  intensity: 0.12 },
    dof:        { enabled: true,  focusDistance: 9.5, blurStrength: 1.0 },
    lut:        { enabled: true,  intensity: 0.70 },
    animPulse:  false,
};

// ── UI wiring ────────────────────────────────────────────────────────────────

function initUI() {
    // Bloom
    wireCheckbox("bloomEnable",   appState.bloom, "enabled");
    wireSlider("bloomIntensity",  appState.bloom, "intensity",  0.01, "bloomIntensityVal");
    wireSlider("bloomThreshold",  appState.bloom, "threshold",  0.01, "bloomThresholdVal");

    // Vignette
    wireCheckbox("vignetteEnable",    appState.vignette, "enabled");
    wireSlider("vignetteIntensity",   appState.vignette, "intensity", 0.01, "vignetteIntensityVal");

    // Grain
    wireCheckbox("grainEnable",       appState.grain, "enabled");
    wireSlider("grainIntensity",      appState.grain, "intensity", 0.01, "grainIntensityVal");

    // DOF
    wireCheckbox("dofEnable",         appState.dof, "enabled");
    wireSlider("dofFocusDist",        appState.dof, "focusDistance", 0.1, "dofFocusDistVal");
    wireSlider("dofBlurStr",          appState.dof, "blurStrength",  0.05, "dofBlurStrVal");

    // LUT
    wireCheckbox("lutEnable",         appState.lut, "enabled");
    wireSlider("lutIntensity",        appState.lut, "intensity", 0.01, "lutIntensityVal");

    // Animation
    wireCheckbox("animPulse",         appState, "animPulse");
}

function wireCheckbox(elementId, target, property) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.checked = target[property];
    el.addEventListener("change", () => { target[property] = el.checked; });
}

function wireSlider(elementId, target, property, step, valDisplayId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const initialVal = target[property];
    const sliderMin = parseFloat(el.min) || 0;
    const sliderMax = parseFloat(el.max) || 100;
    // Derive real range from slider range: sliderMax→sliderMax/100, sliderMin→sliderMin/100
    const realMin = sliderMin / 100;
    const realMax = sliderMax / 100;

    // Convert real value → slider value
    const valFromSlider = (s) => realMin + (s - sliderMin) / (sliderMax - sliderMin) * (realMax - realMin);
    const sliderFromVal = (v) => sliderMin + (v - realMin) / (realMax - realMin) * (sliderMax - sliderMin);

    el.value = sliderFromVal(initialVal);
    el.step = step || "any";
    updateValDisplay(valDisplayId, initialVal);

    el.addEventListener("input", () => {
        const v = valFromSlider(parseFloat(el.value));
        target[property] = v;
        updateValDisplay(valDisplayId, v);
    });
}

function updateValDisplay(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val.toFixed(2);
}

// Update FPS display
function updateInfoDisplay(fps) {
    const fpsEl = document.getElementById("fpsDisplay");
    if (fpsEl) fpsEl.textContent = Math.round(fps);
}

// ── Animated parameter updates ───────────────────────────────────────────────

function updateAnimatedParams(dt, time) {
    if (!appState.animPulse) return;

    // Pulse bloom intensity
    const bloomPulse = 0.5 + 0.5 * Math.sin(time * 1.5);
    appState.bloom.intensity = 0.3 + bloomPulse * 1.7;

    // Pulse grain intensity
    const grainPulse = 0.5 + 0.5 * Math.sin(time * 2.3 + 1.0);
    appState.grain.intensity = 0.03 + grainPulse * 0.22;

    // Slow DOF focus oscillation
    const dofPulse = 0.5 + 0.5 * Math.sin(time * 0.7 + 2.0);
    appState.dof.focusDistance = 2.0 + dofPulse * 5.0;

    // Update UI sliders to reflect animated values
    syncSlidersFromState();
}

function syncSlidersFromState() {
    syncSlider("bloomIntensity",  appState.bloom.intensity,  "bloomIntensityVal");
    syncSlider("grainIntensity",  appState.grain.intensity,   "grainIntensityVal");
    syncSlider("dofFocusDist",    appState.dof.focusDistance, "dofFocusDistVal");
}

function syncSlider(id, val, displayId) {
    const el = document.getElementById(id);
    if (!el) return;
    const sliderMin = parseFloat(el.min) || 0;
    const sliderMax = parseFloat(el.max) || 100;
    const realMin = sliderMin / 100;
    const realMax = sliderMax / 100;
    el.value = sliderMin + (val - realMin) / (realMax - realMin) * (sliderMax - sliderMin);
    updateValDisplay(displayId, val);
}
