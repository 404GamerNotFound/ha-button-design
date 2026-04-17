/*
 * Button Switch Card
 * A Home Assistant custom Lovelace card with an orange button-style layout.
 */

class ButtonSwitchCard extends HTMLElement {
  static async getConfigElement() {
    await customElements.whenDefined("button-switch-card-editor");
    return document.createElement("button-switch-card-editor");
  }

  getConfigElement() {
    return this.constructor.getConfigElement();
  }

  static getStubConfig() {
    return {
      type: "custom:button-switch-card",
      entity: "switch.tv",
      name: "TV",
      icon: "mdi:radiator",
      layout_variant: "compact",
    };
  }

  getStubConfig() {
    return this.constructor.getStubConfig();
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Button Switch Card: You need to define an entity.");
    }

    if (!config.entity.startsWith("switch.")) {
      throw new Error("Button Switch Card: The entity must be from the switch domain (switch.*).");
    }

    const hasLegacyCompactFlag = typeof config.compact === "boolean";
    const requestedLayoutVariant =
      config.layout_variant === "large"
        ? "large"
        : config.layout_variant === "compact"
        ? "compact"
        : hasLegacyCompactFlag && config.compact === false
        ? "large"
        : "compact";

    this._config = {
      name: "",
      title: "",
      icon: "mdi:radiator",
      layout_variant: requestedLayoutVariant,
      compact: requestedLayoutVariant === "compact",
      power_entity: "",
      power_value: "",
      power_unit: "W",
      on_label: "SWITCH ON",
      off_label: "SWITCH OFF",
      unavailable_label: "UNAVAILABLE",
      state_text_on: "Active",
      state_text_off: "Idle",
      state_text_unavailable: "Not available",
      background_start: "#ffa20f",
      background_end: "#ff9800",
      track_color: "rgba(255,255,255,0.25)",
      track_inner_color: "rgba(255,255,255,0.45)",
      knob_color: "#d9d9d9",
      chip_active_background: "rgba(216, 133, 0, 0.8)",
      chip_inactive_background: "rgba(255,255,255,0.14)",
      slider_orientation: "horizontal",
      reverse_direction: false,
      button_color: "",
      name_content: "entity",
      show_power_secondary: true,
      show_on_off_label: false,
      power_thresholds: [],
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      double_tap_action: { action: "toggle" },
      ...config,
    };

    if (this._config.layout_variant !== "large") {
      this._config.layout_variant = "compact";
    }

    this._config.compact = this._config.layout_variant === "compact";
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    const isCompactLayout = this._config?.layout_variant !== "large";
    return isCompactLayout ? 3 : 5;
  }

  getGridOptions() {
    const isCompactLayout = this._config?.layout_variant !== "large";

    return isCompactLayout
      ? { rows: 3, columns: 6, min_rows: 3, min_columns: 6 }
      : { rows: 5, columns: 12, min_rows: 5, min_columns: 12 };
  }

  _escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _escapeAttribute(value) {
    return this._escapeHtml(value);
  }

  _isOn(stateObj) {
    return Boolean(stateObj && stateObj.state === "on");
  }

  _isUnavailable(stateObj) {
    return !stateObj || stateObj.state === "unavailable" || stateObj.state === "unknown";
  }

  _toggleSwitch() {
    if (!this._hass || !this._config) return;
    this._hass.callService("switch", "toggle", { entity_id: this._config.entity });
  }

  _fireAction(actionName) {
    if (!this._hass || !this._config) return;

    const stateObj = this._hass.states[this._config.entity];

    if (this._isUnavailable(stateObj)) {
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId: this._config.entity },
        })
      );
      return;
    }

    const action = this._config[actionName];

    if (!action || !action.action || action.action === "toggle") {
      this._toggleSwitch();
      return;
    }

    if (action.action === "none") {
      return;
    }

    if (action.action === "call-service" && action.service) {
      if (!action.service.includes(".")) return;

      const [domain, service] = action.service.split(".");
      if (!domain || !service) return;

      this._hass.callService(domain, service, action.service_data || {});
      return;
    }

    if (action.action === "more-info") {
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId: this._config.entity },
        })
      );
    }
  }

  _formatPowerValue(rawValue) {
    const parsed = Number.parseFloat(rawValue);

    if (!Number.isFinite(parsed)) {
      return `${rawValue}`.trim();
    }

    if (Math.abs(parsed) >= 100) {
      return `${Math.round(parsed)}`;
    }

    return parsed.toFixed(1).replace(/\.0$/, "");
  }

  _getPowerText() {
    if (!this._config) return "";

    if (this._config.power_entity && this._hass) {
      const powerState = this._hass.states[this._config.power_entity];

      if (powerState) {
        const state = powerState.state;
        if (state === "unknown" || state === "unavailable") {
          return "";
        }

        const unit =
          powerState.attributes?.unit_of_measurement || this._config.power_unit || "W";
        const formattedValue = this._formatPowerValue(state);
        return `${formattedValue} ${unit}`.trim();
      }
    }

    if (this._config.power_value !== "" && this._config.power_value !== undefined) {
      const unit = this._config.power_unit || "W";
      const formattedValue = this._formatPowerValue(this._config.power_value);
      return `${formattedValue} ${unit}`.trim();
    }

    return "";
  }

  _getPowerNumericValue() {
    if (!this._config) return null;

    if (this._config.power_entity && this._hass) {
      const powerState = this._hass.states[this._config.power_entity];

      if (powerState) {
        const parsed = Number.parseFloat(powerState.state);
        return Number.isFinite(parsed) ? parsed : null;
      }
    }

    if (this._config.power_value !== "" && this._config.power_value !== undefined) {
      const parsed = Number.parseFloat(this._config.power_value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  _getPowerThresholds() {
    const rawThresholds = this._config?.power_thresholds;
    if (!rawThresholds) return [];

    let list = rawThresholds;

    if (typeof rawThresholds === "string") {
      try {
        list = JSON.parse(rawThresholds);
      } catch (error) {
        return [];
      }
    }

    if (!Array.isArray(list)) return [];

    return list
      .map((entry) => {
        const threshold =
          entry?.above ?? entry?.threshold ?? entry?.value ?? entry?.watts ?? entry?.watt;
        const parsedThreshold = Number.parseFloat(threshold);

        if (!Number.isFinite(parsedThreshold) || !entry?.color) return null;

        return {
          threshold: parsedThreshold,
          color: entry.color,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.threshold - b.threshold);
  }

  _getActiveButtonColor() {
    if (!this._config) return "";

    const numericPower = this._getPowerNumericValue();
    const thresholds = this._getPowerThresholds();

    if (numericPower !== null && thresholds.length) {
      const matched = thresholds.filter((entry) => numericPower >= entry.threshold).pop();
      if (matched) return matched.color;
    }

    return this._config.button_color || "";
  }

  render() {
    if (!this.shadowRoot || !this._config) return;

    const stateObj = this._hass ? this._hass.states[this._config.entity] : null;
    const isUnavailable = this._isUnavailable(stateObj);
    const isOn = !isUnavailable && this._isOn(stateObj);

    const friendlyName =
      this._config.name || stateObj?.attributes?.friendly_name || this._config.entity;
    const title = this._config.title || friendlyName;
    const powerText = this._getPowerText();

    const isCompactLayout = this._config.layout_variant !== "large";
    const compactClass = isCompactLayout ? "compact" : "";
    const sliderOrientation =
      this._config.slider_orientation === "horizontal" ? "horizontal" : "vertical";
    const reverseDirection = Boolean(this._config.reverse_direction);

    const displayName =
      this._config.name_content === "power" && powerText ? powerText : friendlyName;

    const showSecondaryPower =
      !isUnavailable && Boolean(powerText) && this._config.show_power_secondary;

    const compactPrimaryText = isUnavailable
      ? this._config.unavailable_label
      : showSecondaryPower
      ? powerText
      : isOn
      ? "ON"
      : "OFF";

    const activeButtonColor = this._getActiveButtonColor();

    const cardBackground = activeButtonColor
      ? `linear-gradient(180deg, ${activeButtonColor}, ${activeButtonColor})`
      : `linear-gradient(180deg, ${this._config.background_start}, ${this._config.background_end})`;

    const regularKnobPositionClass = isUnavailable
      ? "unavailable"
      : sliderOrientation === "horizontal"
      ? isOn === reverseDirection
        ? "start"
        : "end"
      : isOn !== reverseDirection
      ? "start"
      : "end";

    const currentStateText = isUnavailable ? "N/A" : isOn ? "ON" : "OFF";
    const statusPillText = isUnavailable
      ? this._config.unavailable_label
      : isOn
      ? this._config.on_label
      : this._config.off_label;
    const stateText = isUnavailable
      ? this._config.state_text_unavailable
      : isOn
      ? this._config.state_text_on
      : this._config.state_text_off;

    const chipClass = isUnavailable ? "unavailable" : isOn ? "active" : "";

    const safeFriendlyName = this._escapeHtml(friendlyName);
    const safeTitle = this._escapeHtml(title);
    const safeDisplayName = this._escapeHtml(displayName);
    const safeEntity = this._escapeHtml(this._config.entity);
    const safeCompactPrimaryText = this._escapeHtml(compactPrimaryText);
    const safeCurrentStateText = this._escapeHtml(currentStateText);
    const safeStatusPillText = this._escapeHtml(statusPillText);
    const safeStateText = this._escapeHtml(stateText);
    const safeAriaLabel = this._escapeAttribute(
      isUnavailable ? `${friendlyName} unavailable` : `Toggle ${friendlyName}`
    );
    const safeIcon = this._escapeAttribute(this._config.icon || "");
    const iconMarkup = safeIcon ? `<ha-icon icon="${safeIcon}"></ha-icon>` : "";

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card ${compactClass}" role="button" tabindex="0" aria-label="${safeAriaLabel}">
          ${
            isCompactLayout
              ? `
          <div class="compact-title">${safeTitle}</div>
          <div class="compact-switch-wrap">
            <div class="compact-track ${sliderOrientation}">
              <div class="compact-track-line"></div>
              <div class="compact-knob ${regularKnobPositionClass}">
                ${iconMarkup}
              </div>
            </div>
          </div>
          <div class="compact-footer">
            <div class="compact-state ${isOn ? "active" : ""} ${showSecondaryPower ? "power" : ""}">${safeCompactPrimaryText}</div>
            ${
              showSecondaryPower && this._config.show_on_off_label !== false
                ? `<div class="compact-mode">${isOn ? "ON" : "OFF"}</div>`
                : ""
            }
          </div>
          `
              : `
          <div class="top-row">
            <div class="label-block">
              <div class="label-title">CURRENT</div>
              <div class="label-value">${safeCurrentStateText}</div>
            </div>
            <div class="label-block right">
              <div class="label-title">ENTITY</div>
              <div class="label-value entity">${safeEntity}</div>
            </div>
          </div>

          <div class="main-name">${safeDisplayName}</div>

          <div class="switch-wrap">
            <div class="track ${sliderOrientation}">
              <div class="track-line"></div>
              <div class="knob ${regularKnobPositionClass}">
                ${iconMarkup}
              </div>
            </div>
          </div>

          <div class="bottom-row">
            <div class="chip ${chipClass}">${safeCurrentStateText}</div>
            ${
              this._config.show_on_off_label !== false
                ? `<div class="status-pill">${safeStatusPillText}</div>`
                : ""
            }
            <div class="state-text">${safeStateText}</div>
          </div>
          `
          }
        </div>
      </ha-card>

      <style>
        :host {
          display: block;
          height: 100%;
        }

        ha-card {
          display: block;
          height: 100%;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: none;
        }

        .card {
          container-type: inline-size;
          --large-track-width: clamp(64px, 30cqw, 88px);
          --large-track-height: clamp(120px, 66cqw, 176px);
          --large-knob-size: clamp(48px, 24cqw, 64px);
          --large-track-padding: clamp(12px, 7cqw, 20px);

          min-height: clamp(210px, 30vw, 300px);
          height: 100%;
          background: ${cardBackground};
          color: #fff;
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          cursor: pointer;
          user-select: none;
          outline: none;
          gap: 10px;
        }

        .card.compact {
          --compact-track-line-inset: clamp(10px, 6cqw, 18px);
          --compact-track-line-size: clamp(5px, 3cqw, 8px);
          --compact-knob-offset: clamp(8px, 4cqw, 14px);

          min-height: clamp(140px, 18vw, 185px);
          height: 100%;
          padding: 12px;
          border-radius: 18px;
          gap: 10px;
        }

        .card:focus-visible {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
          border-radius: 16px;
        }

        .compact-title {
          text-align: center;
          font-size: clamp(18px, 11cqw, 28px);
          font-weight: 700;
          letter-spacing: 0.3px;
          font-family: "Arial", sans-serif;
          line-height: 1.1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          flex: 0 0 auto;
          margin: 0;
        }

        .compact-switch-wrap {
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 70px;
        }

        .compact-track {
          width: 100%;
          height: min(62px, 100%);
          max-width: 100%;
          border-radius: 999px;
          background: ${this._config.track_color};
          position: relative;
          border: 2px solid rgba(255, 255, 255, 0.34);
          box-shadow: inset 0 8px 18px rgba(255, 255, 255, 0.08);
        }

        .compact-track-line {
          position: absolute;
          left: var(--compact-track-line-inset);
          right: var(--compact-track-line-inset);
          top: 50%;
          width: auto;
          height: var(--compact-track-line-size);
          transform: translateY(-50%);
          border-radius: 999px;
          background: ${this._config.track_inner_color};
        }

        .compact-track.horizontal {
          width: 100%;
          height: min(62px, 100%);
        }

        .compact-track:not(.horizontal) {
          width: min(74px, 58%);
          height: 100%;
          min-height: 90px;
          max-width: 74px;
        }

        .compact-track:not(.horizontal) .compact-track-line {
          left: 50%;
          right: auto;
          top: var(--compact-track-line-inset);
          bottom: var(--compact-track-line-inset);
          width: var(--compact-track-line-size);
          height: auto;
          transform: translateX(-50%);
        }

        .compact-track.horizontal .compact-track-line {
          left: var(--compact-track-line-inset);
          right: var(--compact-track-line-inset);
          top: 50%;
          bottom: auto;
          width: auto;
          height: var(--compact-track-line-size);
          transform: translateY(-50%);
        }

        .compact-knob {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40%;
          aspect-ratio: 1 / 1;
          border-radius: 24%;
          background: ${this._config.knob_color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: left 0.25s ease, right 0.25s ease, top 0.25s ease, bottom 0.25s ease;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .compact-knob.start {
          left: var(--compact-knob-offset);
        }

        .compact-knob.end {
          left: auto;
          right: var(--compact-knob-offset);
        }

        .compact-track:not(.horizontal) .compact-knob {
          left: 50%;
          transform: translateX(-50%);
        }

        .compact-track:not(.horizontal) .compact-knob.start {
          top: var(--compact-knob-offset);
          left: 50%;
          right: auto;
        }

        .compact-track:not(.horizontal) .compact-knob.end {
          top: auto;
          bottom: var(--compact-knob-offset);
          left: 50%;
          right: auto;
        }

        .compact-track.horizontal .compact-knob {
          top: 50%;
          transform: translateY(-50%);
        }

        .compact-track.horizontal .compact-knob.start {
          left: var(--compact-knob-offset);
        }

        .compact-track.horizontal .compact-knob.end {
          left: auto;
          right: var(--compact-knob-offset);
        }

        .compact-knob.unavailable {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.6;
        }

        .compact-knob ha-icon {
          --mdc-icon-size: clamp(16px, 8.8cqw, 28px);
        }

        .compact-footer {
          display: grid;
          gap: 6px;
          justify-items: center;
          flex: 0 0 auto;
          margin-top: 0;
        }

        .compact-state {
          border-radius: clamp(20px, 10cqw, 34px);
          padding: 8px 16px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          font-size: clamp(14px, 7.2cqw, 24px);
          border: 2px solid rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.18);
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .compact-state.active {
          background: ${this._config.chip_active_background};
          border-color: transparent;
        }

        .compact-state.power {
          text-transform: none;
          letter-spacing: 0.2px;
          width: fit-content;
          max-width: 92%;
          padding: 8px 14px;
          font-size: clamp(12px, 5.8cqw, 21px);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .compact-mode {
          font-size: clamp(13px, 9cqw, 22px);
          font-weight: 700;
          font-family: "Arial", sans-serif;
          line-height: 1.1;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          gap: clamp(4px, 2cqw, 10px);
          font-family: "Arial", sans-serif;
        }

        .label-title {
          font-size: clamp(10px, 4.8cqw, 12px);
          letter-spacing: 2px;
          opacity: 0.85;
        }

        .label-value {
          margin-top: clamp(2px, 1.5cqw, 6px);
          font-size: clamp(9px, 3.8cqw, 11px);
          font-weight: 700;
        }

        .right {
          text-align: right;
        }

        .entity {
          font-size: clamp(10px, 4.2cqw, 12px);
          opacity: 0.9;
          word-break: break-word;
          max-width: 38cqw;
        }

        .main-name {
          font-size: clamp(18px, 9.2cqw, 28px);
          line-height: 1.05;
          font-weight: 700;
          margin: 6px 0;
          text-align: center;
          font-family: "Arial", sans-serif;
          overflow-wrap: anywhere;
        }

        .switch-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
          min-height: 120px;
        }

        .track {
          width: var(--large-track-width);
          height: var(--large-track-height);
          border-radius: clamp(28px, 14cqw, 42px);
          background: ${this._config.track_color};
          position: relative;
          border: 2px solid rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .track-line {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: var(--large-track-padding);
          bottom: var(--large-track-padding);
          width: clamp(7px, 3.8cqw, 10px);
          border-radius: 12px;
          background: ${this._config.track_inner_color};
        }

        .track.horizontal {
          width: var(--large-track-height);
          height: var(--large-track-width);
        }

        .track.horizontal .track-line {
          left: var(--large-track-padding);
          right: var(--large-track-padding);
          top: 50%;
          bottom: auto;
          width: auto;
          height: clamp(7px, 3.8cqw, 10px);
          transform: translateY(-50%);
        }

        .knob {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: var(--large-knob-size);
          height: var(--large-knob-size);
          border-radius: clamp(14px, 7cqw, 20px);
          background: ${this._config.knob_color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: top 0.25s ease, bottom 0.25s ease, transform 0.25s ease;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .knob.start {
          top: calc(var(--large-track-padding) + clamp(1px, 0.8cqw, 4px));
        }

        .knob.end {
          bottom: calc(var(--large-track-padding) + clamp(1px, 0.8cqw, 4px));
        }

        .track.horizontal .knob {
          top: 50%;
          transform: translateY(-50%);
        }

        .track.horizontal .knob.start {
          left: calc(var(--large-track-padding) + clamp(1px, 0.8cqw, 4px));
        }

        .track.horizontal .knob.end {
          left: auto;
          right: calc(var(--large-track-padding) + clamp(1px, 0.8cqw, 4px));
        }

        .knob.unavailable {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.6;
        }

        .knob ha-icon {
          --mdc-icon-size: clamp(18px, 9.5cqw, 24px);
        }

        .bottom-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: clamp(4px, 2.2cqw, 8px);
          align-items: center;
          margin-top: 6px;
        }

        .chip,
        .status-pill {
          border-radius: 18px;
          padding: 5px 8px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-size: clamp(9px, 4.2cqw, 11px);
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: ${this._config.chip_inactive_background};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chip.active {
          background: ${this._config.chip_active_background};
          border-color: transparent;
        }

        .chip.unavailable {
          opacity: 0.8;
        }

        .state-text {
          font-size: clamp(13px, 7.2cqw, 20px);
          font-weight: 700;
          text-align: right;
          font-family: "Arial", sans-serif;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .card.compact {
            min-height: 132px;
            padding: 10px;
            gap: 8px;
          }

          .compact-track.horizontal {
            height: 56px;
          }

          .compact-title {
            font-size: clamp(16px, 11cqw, 24px);
          }

          .compact-mode {
            font-size: clamp(12px, 9cqw, 21px);
          }
        }
      </style>
    `;

    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;

    card.addEventListener("click", () => this._fireAction("tap_action"));

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._fireAction("tap_action");
      }
    });

    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this._fireAction("hold_action");
    });

    card.addEventListener("dblclick", (event) => {
      event.preventDefault();
      this._fireAction("double_tap_action");
    });
  }
}

class ButtonSwitchCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this._focusState = null;
    this._scrollState = null;
    this._lastInteractedField = null;
  }

  _configsEqual(leftConfig, rightConfig) {
    if (leftConfig === rightConfig) return true;
    if (!leftConfig || !rightConfig) return false;

    try {
      return JSON.stringify(leftConfig) === JSON.stringify(rightConfig);
    } catch (error) {
      return false;
    }
  }

  _escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  _findScrollContainer() {
    let current = this.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const canScroll =
        /(auto|scroll)/.test(style.overflowY || "") && current.scrollHeight > current.clientHeight;

      if (canScroll) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  _captureScrollState() {
    const container = this._findScrollContainer();
    this._scrollState = container
      ? { type: "element", element: container, top: container.scrollTop }
      : { type: "window", top: window.scrollY };
  }

  _restoreScrollState() {
    if (!this._scrollState) return;

    requestAnimationFrame(() => {
      if (this._scrollState.type === "element" && this._scrollState.element) {
        this._scrollState.element.scrollTop = this._scrollState.top;
        return;
      }

      window.scrollTo({ top: this._scrollState.top, behavior: "auto" });
    });
  }

  _captureFocusState(sourceElement = null) {
    const activeElement =
      sourceElement ||
      this.querySelector("ha-textfield:focus, select:focus, input:focus, ha-entity-picker:focus");

    if (!activeElement) {
      this._focusState = null;
      return;
    }

    const tagName = activeElement.tagName?.toLowerCase?.() || "";
    const inputType = activeElement.type || activeElement.inputElement?.type || "";
    const shouldRestoreFocus =
      tagName === "ha-textfield" ||
      tagName === "select" ||
      (tagName === "input" && inputType !== "checkbox" && inputType !== "radio");

    if (!shouldRestoreFocus) {
      this._focusState = null;
      return;
    }

    const valueElement = activeElement.inputElement || activeElement;

    this._focusState = {
      selector:
        `${tagName}` +
        `${activeElement.dataset?.field ? `[data-field="${activeElement.dataset.field}"]` : ""}` +
        `${
          activeElement.dataset?.actionField
            ? `[data-action-field="${activeElement.dataset.actionField}"][data-action-key="${activeElement.dataset.actionKey}"]`
            : ""
        }` +
        `${
          activeElement.dataset?.thresholdIndex
            ? `[data-threshold-index="${activeElement.dataset.thresholdIndex}"][data-threshold-key="${activeElement.dataset.thresholdKey}"]`
            : ""
        }`,
      selectionStart:
        typeof valueElement.selectionStart === "number" ? valueElement.selectionStart : null,
      selectionEnd:
        typeof valueElement.selectionEnd === "number" ? valueElement.selectionEnd : null,
    };
  }

  _restoreFocusState() {
    if (!this._focusState?.selector) return;

    requestAnimationFrame(() => {
      const target = this.querySelector(this._focusState.selector);
      if (!target) return;

      target.focus();

      const valueElement = target.inputElement || target;
      if (
        valueElement &&
        typeof valueElement.setSelectionRange === "function" &&
        this._focusState.selectionStart !== null &&
        this._focusState.selectionEnd !== null
      ) {
        valueElement.setSelectionRange(
          this._focusState.selectionStart,
          this._focusState.selectionEnd
        );
      }
    });
  }

  _emitConfigChanged(nextConfig, rerender = false) {
    this._captureFocusState(this._lastInteractedField);
    this._captureScrollState();
    this._config = nextConfig;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: nextConfig },
      })
    );

    if (rerender) {
      this._render();
    }
  }

  setConfig(config) {
    const hasLegacyCompactFlag = typeof config.compact === "boolean";
    const requestedLayoutVariant =
      config.layout_variant === "large"
        ? "large"
        : config.layout_variant === "compact"
        ? "compact"
        : hasLegacyCompactFlag && config.compact === false
        ? "large"
        : "compact";

    const nextConfig = {
      entity: "",
      name: "",
      title: "",
      icon: "mdi:radiator",
      layout_variant: requestedLayoutVariant,
      compact: requestedLayoutVariant === "compact",
      power_entity: "",
      power_value: "",
      power_unit: "W",
      slider_orientation: "horizontal",
      reverse_direction: false,
      button_color: "",
      name_content: "entity",
      show_power_secondary: true,
      show_on_off_label: false,
      power_thresholds: [],
      on_label: "SWITCH ON",
      off_label: "SWITCH OFF",
      unavailable_label: "UNAVAILABLE",
      state_text_on: "Active",
      state_text_off: "Idle",
      state_text_unavailable: "Not available",
      background_start: "#ffa20f",
      background_end: "#ff9800",
      track_color: "rgba(255,255,255,0.25)",
      track_inner_color: "rgba(255,255,255,0.45)",
      knob_color: "#d9d9d9",
      chip_active_background: "rgba(216, 133, 0, 0.8)",
      chip_inactive_background: "rgba(255,255,255,0.14)",
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      double_tap_action: { action: "toggle" },
      ...config,
    };

    if (nextConfig.layout_variant !== "large") {
      nextConfig.layout_variant = "compact";
    }

    nextConfig.compact = nextConfig.layout_variant === "compact";

    if (!Array.isArray(nextConfig.power_thresholds)) {
      nextConfig.power_thresholds = [];
    }

    if (this._configsEqual(this._config, nextConfig)) {
      this._config = nextConfig;
      return;
    }

    this._captureScrollState();
    this._config = nextConfig;
    this._render();
  }

  set hass(hass) {
    const isFirstRender = !this._hass;
    this._hass = hass;

    if (isFirstRender) {
      this._captureScrollState();
      this._render();
      return;
    }

    const entityPicker = this.querySelector('ha-entity-picker[data-field="entity"]');
    if (entityPicker) {
      entityPicker.hass = hass;
      entityPicker.includeDomains = ["switch"];
    }
  }

  _valueChanged(event) {
    if (!this._config) return;

    const target = event.target;
    this._lastInteractedField = target;

    const field = target?.dataset?.field;
    if (!field) return;

    const detailValue = event.detail?.value;
    const rawValue = detailValue !== undefined ? detailValue : target.value;
    const value = target.type === "checkbox" ? target.checked : rawValue;

    const nextConfig = { ...this._config };
    const previousValue = nextConfig[field];

    if (typeof value === "boolean") {
      nextConfig[field] = value;
    } else if (value !== undefined && value !== null && value !== "") {
      nextConfig[field] = value;
    } else {
      delete nextConfig[field];
    }

    if (field === "layout_variant") {
      if (nextConfig.layout_variant !== "large") {
        nextConfig.layout_variant = "compact";
      }
      nextConfig.compact = nextConfig.layout_variant === "compact";
    }

    if (previousValue === nextConfig[field]) return;

    const shouldRerender = field === "layout_variant";
    this._emitConfigChanged(nextConfig, shouldRerender);
  }

  _actionChanged(event) {
    if (!this._config) return;

    const target = event.target;
    this._lastInteractedField = target;

    const actionField = target?.dataset?.actionField;
    const key = target?.dataset?.actionKey;
    if (!actionField || !key) return;

    const nextConfig = { ...this._config };
    const currentAction = { ...(nextConfig[actionField] || {}) };
    const rawValue = event.detail?.value !== undefined ? event.detail.value : target.value;
    const value = typeof rawValue === "string" ? rawValue : rawValue ?? "";

    if (!value) {
      delete currentAction[key];
    } else if (key === "service_data") {
      try {
        currentAction[key] = JSON.parse(value);
      } catch (error) {
        return;
      }
    } else {
      currentAction[key] = value;
    }

    if (!currentAction.action) {
      currentAction.action = "toggle";
    }

    nextConfig[actionField] = currentAction;
    this._emitConfigChanged(nextConfig);
  }

  _thresholdChanged(index, key, value) {
    const thresholds = [...(this._config.power_thresholds || [])];
    const current = { ...(thresholds[index] || { above: "", color: "#ff0000" }) };
    current[key] = value;
    thresholds[index] = current;

    this._emitConfigChanged(
      { ...this._config, power_thresholds: thresholds },
      false
    );
  }

  _addThreshold() {
    const thresholds = [...(this._config.power_thresholds || [])];
    thresholds.push({ above: "", color: "#ff0000" });

    this._emitConfigChanged(
      { ...this._config, power_thresholds: thresholds },
      true
    );
  }

  _removeThreshold(index) {
    const thresholds = [...(this._config.power_thresholds || [])];
    thresholds.splice(index, 1);

    this._emitConfigChanged(
      { ...this._config, power_thresholds: thresholds },
      true
    );
  }

  _renderActionFields(actionField, label) {
    const action = this._config[actionField] || { action: "toggle" };
    const serviceData =
      typeof action.service_data === "object"
        ? JSON.stringify(action.service_data)
        : action.service_data || "";

    return `
      <fieldset class="action-group">
        <legend>${label}</legend>
        <label class="orientation-field">
          <span>Action type</span>
          <select data-action-field="${actionField}" data-action-key="action">
            <option value="toggle" ${
              action.action !== "more-info" && action.action !== "call-service" ? "selected" : ""
            }>Toggle</option>
            <option value="more-info" ${action.action === "more-info" ? "selected" : ""}>More info</option>
            <option value="call-service" ${action.action === "call-service" ? "selected" : ""}>Call service</option>
          </select>
        </label>
        <ha-textfield
          label="Service (for call-service)"
          helper="Example: light.turn_on"
          data-action-field="${actionField}"
          data-action-key="service"
          value="${this._escapeAttribute(action.service || "")}"
        ></ha-textfield>
        <ha-textfield
          label="Service data JSON"
          helper='Example: {"entity_id":"switch.tv"}'
          data-action-field="${actionField}"
          data-action-key="service_data"
          value="${this._escapeAttribute(serviceData)}"
        ></ha-textfield>
      </fieldset>
    `;
  }

  _render() {
    if (!this._config) return;

    const entityField = this._hass
      ? `
        <ha-entity-picker
          label="Switch entity"
          data-field="entity"
          value="${this._escapeAttribute(this._config.entity || "")}"
        ></ha-entity-picker>
      `
      : `
        <ha-textfield
          label="Switch entity"
          helper="Example: switch.tv"
          data-field="entity"
          value="${this._escapeAttribute(this._config.entity || "")}"
        ></ha-textfield>
      `;

    this.innerHTML = `
      <div class="card-config">
        ${entityField}

        <ha-textfield
          label="Name"
          data-field="name"
          value="${this._escapeAttribute(this._config.name || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Title (compact)"
          data-field="title"
          value="${this._escapeAttribute(this._config.title || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Icon"
          helper="Example: mdi:radiator"
          data-field="icon"
          value="${this._escapeAttribute(this._config.icon || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Power entity (optional)"
          helper="Example: sensor.tv_power"
          data-field="power_entity"
          value="${this._escapeAttribute(this._config.power_entity || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Power value fallback"
          helper="Example: 120"
          data-field="power_value"
          value="${this._escapeAttribute(this._config.power_value || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Power unit"
          helper="Default: W"
          data-field="power_unit"
          value="${this._escapeAttribute(this._config.power_unit || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Button color override (optional)"
          helper="Example: #ff9800"
          data-field="button_color"
          value="${this._escapeAttribute(this._config.button_color || "")}"
        ></ha-textfield>

        <ha-textfield
          label="On label"
          data-field="on_label"
          value="${this._escapeAttribute(this._config.on_label || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Off label"
          data-field="off_label"
          value="${this._escapeAttribute(this._config.off_label || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Unavailable label"
          data-field="unavailable_label"
          value="${this._escapeAttribute(this._config.unavailable_label || "")}"
        ></ha-textfield>

        <ha-textfield
          label="State text when on"
          data-field="state_text_on"
          value="${this._escapeAttribute(this._config.state_text_on || "")}"
        ></ha-textfield>

        <ha-textfield
          label="State text when off"
          data-field="state_text_off"
          value="${this._escapeAttribute(this._config.state_text_off || "")}"
        ></ha-textfield>

        <ha-textfield
          label="State text when unavailable"
          data-field="state_text_unavailable"
          value="${this._escapeAttribute(this._config.state_text_unavailable || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Background start"
          data-field="background_start"
          value="${this._escapeAttribute(this._config.background_start || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Background end"
          data-field="background_end"
          value="${this._escapeAttribute(this._config.background_end || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Track color"
          data-field="track_color"
          value="${this._escapeAttribute(this._config.track_color || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Track inner color"
          data-field="track_inner_color"
          value="${this._escapeAttribute(this._config.track_inner_color || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Knob color"
          data-field="knob_color"
          value="${this._escapeAttribute(this._config.knob_color || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Chip active background"
          data-field="chip_active_background"
          value="${this._escapeAttribute(this._config.chip_active_background || "")}"
        ></ha-textfield>

        <ha-textfield
          label="Chip inactive background"
          data-field="chip_inactive_background"
          value="${this._escapeAttribute(this._config.chip_inactive_background || "")}"
        ></ha-textfield>

        <label class="orientation-field">
          <span>Layout variant</span>
          <select data-field="layout_variant">
            <option value="compact" ${this._config.layout_variant !== "large" ? "selected" : ""}>
              Compact (default)
            </option>
            <option value="large" ${this._config.layout_variant === "large" ? "selected" : ""}>
              Large (explicit)
            </option>
          </select>
        </label>

        <label class="toggle-field">
          <span>Show power below compact switch</span>
          <input
            type="checkbox"
            data-field="show_power_secondary"
            ${this._config.show_power_secondary ? "checked" : ""}
          />
        </label>

        <label class="toggle-field">
          <span>Show ON/OFF label</span>
          <input
            type="checkbox"
            data-field="show_on_off_label"
            ${this._config.show_on_off_label !== false ? "checked" : ""}
          />
        </label>

        <label class="orientation-field">
          <span>Name content</span>
          <select data-field="name_content">
            <option value="entity" ${this._config.name_content !== "power" ? "selected" : ""}>
              Entity name
            </option>
            <option value="power" ${this._config.name_content === "power" ? "selected" : ""}>
              Power text
            </option>
          </select>
        </label>

        <label class="orientation-field">
          <span>Slider orientation</span>
          <select data-field="slider_orientation">
            <option value="vertical" ${this._config.slider_orientation !== "horizontal" ? "selected" : ""}>
              Vertical
            </option>
            <option value="horizontal" ${this._config.slider_orientation === "horizontal" ? "selected" : ""}>
              Horizontal
            </option>
          </select>
        </label>

        <label class="toggle-field">
          <span>Reverse switch direction</span>
          <input
            type="checkbox"
            data-field="reverse_direction"
            ${this._config.reverse_direction ? "checked" : ""}
          />
        </label>

        ${this._renderActionFields("tap_action", "Tap action")}
        ${this._renderActionFields("hold_action", "Hold action")}
        ${this._renderActionFields("double_tap_action", "Double tap action")}

        <fieldset class="action-group">
          <legend>Power thresholds</legend>
          <p class="helper">Define dynamic button colors by power values.</p>
          ${(this._config.power_thresholds || [])
            .map(
              (entry, index) => `
                <div class="threshold-row" data-index="${index}">
                  <ha-textfield
                    label="Above"
                    type="number"
                    data-threshold-index="${index}"
                    data-threshold-key="above"
                    value="${this._escapeAttribute(entry.above ?? "")}"
                  ></ha-textfield>
                  <ha-textfield
                    label="Color"
                    data-threshold-index="${index}"
                    data-threshold-key="color"
                    value="${this._escapeAttribute(entry.color || "")}"
                  ></ha-textfield>
                  <button type="button" data-remove-threshold="${index}">Remove</button>
                </div>
              `
            )
            .join("")}
          <button type="button" class="add-threshold">Add threshold</button>
        </fieldset>
      </div>

      <style>
        .card-config {
          display: grid;
          gap: 12px;
          padding-bottom: 4px;
        }

        .orientation-field {
          display: grid;
          gap: 6px;
          font-size: 14px;
        }

        .toggle-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
        }

        .orientation-field select {
          background: transparent;
          color: inherit;
          border: 1px solid rgba(127, 127, 127, 0.5);
          border-radius: 4px;
          padding: 8px;
          font: inherit;
        }

        .action-group {
          display: grid;
          gap: 8px;
          border: 1px solid rgba(127, 127, 127, 0.5);
          border-radius: 6px;
          padding: 10px;
          margin: 0;
        }

        .action-group legend {
          padding: 0 4px;
        }

        .threshold-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .helper {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }

        button {
          border: 1px solid rgba(127, 127, 127, 0.5);
          border-radius: 6px;
          background: transparent;
          color: inherit;
          padding: 8px 12px;
          cursor: pointer;
        }
      </style>
    `;

    this.querySelectorAll("ha-textfield[data-field]").forEach((input) => {
      input.addEventListener("change", (event) => this._valueChanged(event));
    });

    this.querySelectorAll("ha-textfield[data-action-field]").forEach((input) => {
      input.addEventListener("change", (event) => this._actionChanged(event));
    });

    this.querySelectorAll("select[data-action-field]").forEach((input) => {
      input.addEventListener("change", (event) => this._actionChanged(event));
    });

    this.querySelectorAll("ha-textfield[data-threshold-index]").forEach((input) => {
      const index = Number(input.dataset.thresholdIndex);
      const key = input.dataset.thresholdKey;

      input.addEventListener("change", (event) => {
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        this._thresholdChanged(index, key, value);
      });
    });

    const entityPicker = this.querySelector('ha-entity-picker[data-field="entity"]');
    if (entityPicker) {
      entityPicker.hass = this._hass;
      entityPicker.includeDomains = ["switch"];
      entityPicker.addEventListener("value-changed", (event) => this._valueChanged(event));
    }

    this.querySelectorAll('input[type="checkbox"][data-field]').forEach((input) => {
      input.addEventListener("change", (event) => this._valueChanged(event));
    });

    this.querySelectorAll(
      'select[data-field="slider_orientation"], select[data-field="name_content"], select[data-field="layout_variant"]'
    ).forEach((input) => {
      input.addEventListener("change", (event) => this._valueChanged(event));
    });

    const addThresholdButton = this.querySelector("button.add-threshold");
    if (addThresholdButton) {
      addThresholdButton.addEventListener("click", () => this._addThreshold());
    }

    this.querySelectorAll("button[data-remove-threshold]").forEach((button) => {
      const index = Number(button.dataset.removeThreshold);
      button.addEventListener("click", () => this._removeThreshold(index));
    });

    this._restoreScrollState();
    this._restoreFocusState();
  }
}

if (!customElements.get("button-switch-card")) {
  customElements.define("button-switch-card", ButtonSwitchCard);
}

if (!customElements.get("button-switch-card-editor")) {
  customElements.define("button-switch-card-editor", ButtonSwitchCardEditor);
}

window.customCards = window.customCards || [];

const buttonSwitchPickerCards = [
  {
    type: "custom:button-switch-card",
    name: "Button Switch Card",
    description: "Switch on/off controller card with a visual editor and preview support.",
  },
];

buttonSwitchPickerCards.forEach((cardDefinition) => {
  const alreadyRegistered = window.customCards.some((entry) => entry.type === cardDefinition.type);
  if (alreadyRegistered) return;

  window.customCards.push({
    ...cardDefinition,
    preview: true,
    documentationURL: "https://github.com/404GamerNotFound/ha-button-design",
  });
});
