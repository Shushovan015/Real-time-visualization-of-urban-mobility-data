import { useEffect, useRef, useContext } from "react";
import Overlay from "ol/Overlay";
import { useSelector } from "react-redux";
import * as d3 from "d3";
import { MapContext } from "../MapContainer";
import "./chart-popup.css";

const CHART_MODE = "heatmap";

const CAP_QUANTILE = 0.95;
const RATIO_WINSOR = 0.95;
const RED_TOP_PCT = 0.9;
const MID_Q1 = 0.35;
const MID_Q2 = 0.65;

const clamp01 = (x) => Math.max(0, Math.min(1, x ?? 0));

function popularityComposite(pop) {
  if (!pop) return { pct: null, label: null };
  const base01 = clamp01(pop.normalized ?? pop.normalize ?? pop.score ?? 0);
  const pct = Math.round(base01 * 100);
  const label =
    base01 >= 0.8
      ? "Very High"
      : base01 >= 0.5
        ? "High"
        : base01 >= 0.4
          ? "Moderate"
          : base01 >= 0.15
            ? "Low"
            : "Very Low";
  return { pct, label };
}

const normalizeState = (label) => {
  const s = (label || "").toLowerCase();
  if (s.includes("overcrowd") || s.includes("packed")) return "Packed";
  if (s.includes("busy")) return "Busy";
  if (s.includes("lively")) return "Lively";
  if (s.includes("chill") || s.includes("calm")) return "Calm";
  return "Calm";
};

function makePill(prefix, value, tone = "muted") {
  const span = document.createElement("span");
  span.className = `pill pill--${tone}`;
  const pre = document.createElement("span");
  pre.className = "pill-pre";
  pre.textContent = `${prefix}:`;
  const val = document.createElement("span");
  val.className = "pill-val";
  val.textContent = value;
  span.append(pre, val);
  return span;
}

export default function ChartPopup({ hoverInfo }) {
  const { map } = useContext(MapContext);
  const overlayRef = useRef(null);
  const chartRef = useRef(null);
  const legendRef = useRef(null);

  const allHourlyHistoryData = useSelector(
    (state) => state.home.allHourlyHistoryData
  );

  useEffect(() => {
    if (!map) return;

    if (!overlayRef.current) {
      const root = document.createElement("div");
      root.className = "chart-popup";

      const header = document.createElement("div");
      header.className = "popup-header";
      root.appendChild(header);

      const body = document.createElement("div");
      body.className = "popup-body";

      const chartDiv = document.createElement("div");
      chartDiv.className = "popup-chart";
      body.appendChild(chartDiv);
      chartRef.current = chartDiv;

      const legendDiv = document.createElement("div");
      legendDiv.className = "popup-legend";
      body.appendChild(legendDiv);
      legendRef.current = legendDiv;

      root.appendChild(body);

      const overlay = new Overlay({
        element: root,
        offset: [14, 14],
        positioning: "top-left",
        autoPan: true,
        autoPanMargin: 40,
        autoPanAnimation: { duration: 250 },
        stopEvent: true,
        zIndex: 2147483647,
      });

      map.addOverlay(overlay);
      overlayRef.current = overlay;
    }

    const locKey = hoverInfo?.location;
    if (!hoverInfo || !locKey || !allHourlyHistoryData?.[locKey]) {
      overlayRef.current.setPosition(undefined);
      return;
    }

    const { coordinate } = hoverInfo;
    const rawData = allHourlyHistoryData[locKey];

    const parseTime = d3.isoParse;
    const formatHour = d3.timeFormat("%H:00");
    const formatDay = d3.timeFormat("%A");

    const weekdayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const grouped = {};
    (rawData || []).forEach(({ time, visitors }) => {
      const dt = parseTime(time);
      if (!dt) return;
      const hour = formatHour(dt);
      const day = formatDay(dt);
      if (!grouped[day]) grouped[day] = {};
      grouped[day][hour] = (grouped[day][hour] || 0) + (Number(visitors) || 0);
    });

    const allHours = Array.from({ length: 13 }, (_, i) =>
      d3.timeFormat("%H:00")(new Date(2000, 0, 1, 8 + i))
    );

    const finalData = weekdayOrder
      .filter((d) => grouped[d])
      .map((day) => ({
        day,
        values: allHours.map((h) => ({ hour: h, value: grouped[day][h] || 0 })),
      }));

    overlayRef.current.setPosition(coordinate);

    const headerEl = overlayRef.current
      .getElement()
      .querySelector(".popup-header");
    if (headerEl) {
      headerEl.innerHTML = "";

      const nameEl = document.createElement("strong");
      nameEl.textContent = locKey;
      nameEl.className = "title";
      headerEl.appendChild(nameEl);

      const state = normalizeState(hoverInfo.label || hoverInfo.state);
      const stateTone =
        { Calm: "success", Lively: "info", Busy: "danger", Packed: "danger" }[
        state
        ] || "muted";
      headerEl.appendChild(
        makePill("Now", state === "Busy" ? "Crowded" : state, stateTone)
      );

      const badgeText = hoverInfo?.badge;
      if (badgeText) {
        const badgeTone =
          {
            "Getting Quieter": "success",
            "Getting Busier": "warn",
            "Crowd Increasing Fast": "danger",
            "Holding High": "muted",
            Strain: "danger",
            Stable: "muted",
          }[badgeText] || "muted";
        headerEl.appendChild(makePill("Trend", badgeText, badgeTone));
      }

      const { pct: popPct, label: popLabel } = popularityComposite(
        hoverInfo?.popularity
      );
      if (popLabel) {
        const popTone =
          {
            "Very High": "info",
            High: "info",
            Moderate: "muted",
            Low: "success",
            "Very Low": "success",
          }[popLabel] || "muted";
        headerEl.appendChild(
          makePill("Popularity", `${popLabel} (${popPct}%)`, popTone)
        );
      }
      if (hoverInfo?.subKind) {
        const kindVal = hoverInfo.subKind;
        const formattedKind = kindVal
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const kindTone = "info";
        headerEl.appendChild(makePill("Type", formattedKind, kindTone));
      }
    }

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    drawChart(CHART_MODE, finalData, hoverInfo, isMobile);
  }, [map, hoverInfo, allHourlyHistoryData]);

  function drawChart(mode, dataByDay, hoverInfo, isMobileParam) {
    const isMobile =
      isMobileParam ?? window.matchMedia("(max-width: 768px)").matches;
    const W = isMobile
      ? Math.max(280, chartRef.current?.clientWidth || 320)
      : 740;
    const H = isMobile ? 220 : 330;

    d3.select(chartRef.current).html("");
    d3.select(legendRef.current).html("");

    if (mode === "heatmap") {
      drawChartHeatmap(dataByDay, hoverInfo, W, H, isMobile);
      if (isMobile) renderLegendHeatmap();
    } else {
      drawChartLines(dataByDay, hoverInfo, W, H, isMobile);
      if (isMobile) renderLegendLines(dataByDay);
    }
  }

  function renderLegendHeatmap() {
    const items = [
      { colorName: "Green", fill: "#2E7D32", stroke: "#1B5E20", label: "Calm" },
      {
        colorName: "Blue",
        fill: "#1565C0",
        stroke: "#0D47A1",
        label: "Lively",
      },
      {
        colorName: "Orange",
        fill: "#EF6C00",
        stroke: "#E65100",
        label: "Busy",
      },
      {
        colorName: "Red",
        fill: "#C62828",
        stroke: "#B71C1C",
        label: "Overcrowded",
      },
    ];

    const legend = d3
      .select(legendRef.current)
      .append("div")
      .attr("class", "legend legend--heatmap legend--mobile");

    items.forEach((it) => {
      const row = legend.append("div").attr("class", "legend-row");
      row
        .append("span")
        .attr("class", "legend-swatch")
        .style("background", it.fill)
        .style("border-color", it.stroke);
      row
        .append("span")
        .attr("class", "legend-label")
        .text(`${it.colorName} — ${it.label}`);
    });
  }

  function renderLegendLines(dataByDay) {
    const palette = [
      "#0072B2",
      "#E69F00",
      "#009E73",
      "#D55E00",
      "#CC79A7",
      "#56B4E9",
      "#F0E442",
    ];
    const color = d3.scaleOrdinal(palette).domain(dataByDay.map((d) => d.day));

    const legend = d3
      .select(legendRef.current)
      .append("div")
      .attr("class", "legend legend--lines legend--mobile");

    dataByDay.forEach((series) => {
      const row = legend.append("div").attr("class", "legend-row");
      row
        .append("span")
        .attr("class", "legend-swatch")
        .style("background", color(series.day));
      row.append("span").attr("class", "legend-label").text(series.day);
    });
  }

  function drawChartHeatmap(dataByDay, hoverInfo, W, H, isMobile) {
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", W)
      .attr("height", H);

    const margin = isMobile
      ? { top: 36, right: 12, bottom: 44, left: 64 }
      : { top: 44, right: 190, bottom: 56, left: 110 };

    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const days = dataByDay.map((d) => d.day);
    const hours = dataByDay[0]?.values.map((v) => v.hour) || [];

    const flat = [];
    dataByDay.forEach((day) => {
      day.values.forEach((v) =>
        flat.push({ day: day.day, hour: v.hour, value: v.value })
      );
    });

    const capFromData = Math.max(
      1,
      d3.quantile(flat.map((d) => d.value).sort(d3.ascending), CAP_QUANTILE) ||
      1
    );
    const cap = Math.max(1, hoverInfo?.capacity || capFromData);

    const rawRatios = flat.map((d) => d.value / cap).sort(d3.ascending);
    const r95 = d3.quantile(rawRatios, RATIO_WINSOR) ?? 2;
    const ratios = rawRatios.map((r) => Math.min(r, r95)).sort(d3.ascending);

    const t0 = d3.quantile(ratios, MID_Q1) ?? 0.6;
    const t1 = d3.quantile(ratios, MID_Q2) ?? 0.9;
    const t2 = d3.quantile(ratios, RED_TOP_PCT) ?? 1.2;
    flat.forEach((d) => (d.ratio = Math.min(d.value / cap, r95)));

    const x = d3.scaleBand().domain(hours).range([0, width]).padding(0.12);
    const y = d3.scaleBand().domain(days).range([0, height]).padding(0.18);

    const palette = {
      Calm: { fill: "#2E7D32", stroke: "#1B5E20" },
      Lively: { fill: "#1565C0", stroke: "#0D47A1" },
      Busy: { fill: "#EF6C00", stroke: "#E65100" },
      Packed: { fill: "#C62828", stroke: "#B71C1C" },
    };
    const classify = (r) =>
      r < t0 ? "Calm" : r < t1 ? "Lively" : r < t2 ? "Busy" : "Packed";

    // best time
    const hourToNorm = {};
    hours.forEach((h) => (hourToNorm[h] = []));
    dataByDay.forEach((d) => {
      d.values.forEach(({ hour, value }) => {
        hourToNorm[hour].push(Math.min(value / cap, 2));
      });
    });
    const quietness = hours.map((h) => ({
      hour: h,
      q: 1 - Math.min(1, d3.mean(hourToNorm[h]) || 0),
    }));
    let bestIdx = 0,
      bestAvg = -Infinity;
    for (let i = 0; i < quietness.length - 1; i++) {
      const avg = (quietness[i].q + quietness[i + 1].q) / 2;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestIdx = i;
      }
    }
    const bestStart = hours[bestIdx] || "—";
    const bestEnd = hours[bestIdx + 1] || "—";

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 22)
      .attr("font-size", isMobile ? 14 : 16)
      .attr("font-weight", "700")
      .attr("fill", "#0a7a2a")
      .text(`Best Time To Visit: ${bestStart}–${bestEnd}`);

    g.append("rect")
      .attr("x", -8)
      .attr("y", -8)
      .attr("width", width + 16)
      .attr("height", height + 16)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#ffffff")
      .attr("stroke", "#eef1f5");

    g.selectAll("rect.cell")
      .data(flat)
      .join("rect")
      .attr("class", "cell")
      .attr("x", (d) => x(d.hour))
      .attr("y", (d) => y(d.day))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", (d) => palette[classify(d.ratio)].fill)
      .attr("stroke", (d) => palette[classify(d.ratio)].stroke)
      .attr("stroke-width", 0.6);

    g.append("rect")
      .attr("x", x(bestStart) - x.step() * 0.02)
      .attr("y", -4)
      .attr("width", x.bandwidth() * 2 + x.step() * 0.04)
      .attr("height", height + 8)
      .attr("fill", "none")
      .attr("stroke", "#0a7a2a")
      .attr("stroke-width", 1.6)
      .attr("stroke-dasharray", "4 4")
      .attr("pointer-events", "none");

    const xAxis = d3.axisBottom(x).tickValues(hours).tickSizeOuter(0);
    const yAxis = d3.axisLeft(y).tickValues(days).tickSizeOuter(0);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start")
      .style("font-size", isMobile ? "11px" : "13px");

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", isMobile ? "11px" : "13px");

    if (!isMobile) {
      const legend = svg
        .append("g")
        .attr(
          "transform",
          `translate(${margin.left + width + 28}, ${margin.top - 6})`
        );

      [
        { key: "Calm", label: "Calm – Relaxing" },
        { key: "Lively", label: "Lively – Enjoyable" },
        { key: "Busy", label: "Busy – Crowded" },
        { key: "Packed", label: "Packed – Overwhelming" },
      ].forEach((it, i) => {
        const row = legend
          .append("g")
          .attr("transform", `translate(0, ${i * 22})`);
        row
          .append("rect")
          .attr("width", 14)
          .attr("height", 14)
          .attr("rx", 4)
          .attr("ry", 4)
          .attr("fill", palette[it.key].fill)
          .attr("stroke", palette[it.key].stroke)
          .attr("stroke-width", 0.8);
        row
          .append("text")
          .attr("x", 20)
          .attr("y", 11)
          .style("font-size", "12.5px")
          .text(it.label);
      });
    }
  }

  function drawChartLines(dataByDay, hoverInfo, W, H, isMobile) {
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", W)
      .attr("height", H);

    const margin = isMobile
      ? { top: 36, right: 12, bottom: 56, left: 56 }
      : { top: 44, right: 170, bottom: 56, left: 64 };

    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;

    const allHours = dataByDay[0]?.values.map((d) => d.hour) || [];
    const x = d3.scalePoint().domain(allHours).range([0, width]);

    const yMax = Math.max(
      1,
      d3.max(dataByDay, (d) => d3.max(d.values, (v) => v.value)) || 1
    );
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

    const palette = [
      "#0072B2",
      "#E69F00",
      "#009E73",
      "#D55E00",
      "#CC79A7",
      "#56B4E9",
      "#F0E442",
    ];
    const color = d3.scaleOrdinal(palette).domain(dataByDay.map((d) => d.day));

    const line = d3
      .line()
      .x((d) => x(d.hour))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const capFromData = Math.max(
      1,
      d3.quantile(
        dataByDay
          .flatMap((d) => d.values.map((v) => v.value))
          .sort(d3.ascending),
        CAP_QUANTILE
      ) || 1
    );
    const cap = Math.max(1, hoverInfo?.capacity || capFromData);

    const avgVisitorsByHour = {};
    dataByDay.forEach((dayData) => {
      dayData.values.forEach(({ hour, value }) => {
        if (!avgVisitorsByHour[hour]) avgVisitorsByHour[hour] = [];
        avgVisitorsByHour[hour].push(Math.min(value / cap, 1));
      });
    });
    const quietnessByHour = Object.entries(avgVisitorsByHour).map(
      ([hour, arr]) => ({ hour, q: 1 - (d3.mean(arr) || 0) })
    );
    let bestIdx = 0,
      bestAvg = -Infinity;
    quietnessByHour.forEach((d, i) => {
      if (i < quietnessByHour.length - 1) {
        const avg = (d.q + quietnessByHour[i + 1].q) / 2;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestIdx = i;
        }
      }
    });
    const startHour = quietnessByHour[bestIdx]?.hour || "—";
    const endHour = quietnessByHour[bestIdx + 1]?.hour || "—";
    const quietPct = Math.round(bestAvg * 100);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 22)
      .attr("font-size", isMobile ? 14 : 16)
      .attr("font-weight", "700")
      .attr("fill", "#0a7a2a")
      .text(`Best Time: ${startHour}–${endHour} (Quietness: ${quietPct}%)`);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start")
      .style("font-size", isMobile ? "11px" : "13px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .style("font-size", isMobile ? "11px" : "13px");

    g.selectAll(".series")
      .data(dataByDay)
      .join("path")
      .attr("class", "series")
      .attr("fill", "none")
      .attr("stroke", (d) => color(d.day))
      .attr("stroke-width", 2.2)
      .attr("opacity", 0.55)
      .attr("d", (d) => line(d.values));

    const today = new Date();
    const todayName = d3.timeFormat("%A")(today);
    const todaySeries =
      dataByDay.find((d) => d.day === todayName) || dataByDay[0];
    if (todaySeries) {
      g.append("path")
        .datum(todaySeries.values)
        .attr("fill", "none")
        .attr("stroke", color(todaySeries.day))
        .attr("stroke-width", 3.2)
        .attr("opacity", 1)
        .attr("d", line);
    }

    if (!isMobile) {
      const legend = svg
        .append("g")
        .attr("transform", `translate(${740 - 150}, 14)`);
      dataByDay.forEach((series, i) => {
        const row = legend
          .append("g")
          .attr("transform", `translate(0, ${i * 18})`);
        row
          .append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", color(series.day));
        row
          .append("text")
          .attr("x", 16)
          .attr("y", 11)
          .style("font-size", "13px")
          .text(series.day);
      });
    }
  }

  return null;
}


