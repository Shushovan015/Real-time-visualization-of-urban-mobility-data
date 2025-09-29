import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import homeActions from "../../actions/home";
import * as d3 from "d3";

const Charts = ({ location }) => {
  const chartRef = useRef();
  const dispatch = useDispatch();
  const hourlyHistoryData = useSelector(
    (state) => state.home.hourlyHistoryData
  );

  useEffect(() => {
    dispatch(homeActions.getHourlyHistoryDataRequest({ location: "ZOB" }));
  }, [location]);

  useEffect(() => {
    if (!hourlyHistoryData || hourlyHistoryData.length === 0) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 500;
    const margin = { top: 60, right: 150, bottom: 80, left: 90 };

    const grouped = Array.isArray(hourlyHistoryData[0])
      ? hourlyHistoryData
      : [];
    if (grouped.length === 0) return;

    const x = d3
      .scaleLinear()
      .domain([8, 20])
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(
          grouped.flatMap(([_, entries]) => entries.map((d) => d.visitors))
        ) || 100,
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(13)
          .tickFormat((d) => `${d}:00`)
      )
      .selectAll("text")
      .style("font-size", "14px");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "14px");

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 30)
      .style("font-size", "14px")
      .text("Hour of Day");

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90)`)
      .attr("x", -height / 2)
      .attr("y", 20)
      .style("font-size", "14px")
      .text("Number of Visitors");

    grouped.forEach(([date, entries], index) => {
      const hourlyMap = new Map(entries.map((d) => [d.hour, d.visitors]));
      const filledEntries = Array.from({ length: 13 }, (_, i) => {
        const hour = 8 + i;
        return {
          hour,
          visitors: hourlyMap.get(hour) ?? null,
        };
      });

      svg
        .append("path")
        .datum(filledEntries)
        .attr("fill", "none")
        .attr("stroke", color(date))
        .attr("stroke-width", 2.5)
        .attr(
          "d",
          d3
            .line()
            .defined((d) => d.visitors !== null)
            .x((d) => x(d.hour))
            .y((d) => y(d.visitors))
        );
    });

    // Add chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text(`Hourly Visitors at ${location}`);

    // Add legend
    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - margin.right + 20}, ${margin.top})`
      );

    grouped.forEach(([date], i) => {
      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", i * 25)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color(date));

      legend
        .append("text")
        .attr("x", 20)
        .attr("y", i * 25 + 12)
        .text(date)
        .style("font-size", "12px")
        .style("alignment-baseline", "middle");
    });
  }, [hourlyHistoryData]);

  return (
    <svg
      ref={chartRef}
      width={800}
      height={500}
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    />
  );
};

export default Charts;
