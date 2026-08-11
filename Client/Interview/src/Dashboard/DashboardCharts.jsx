// src/Dashboard/DashboardCharts.jsx
// Premium D3.js chart components for the HR Dashboard

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Sparkline — Tiny inline chart for KPI cards
// ============================================================================
export const Sparkline = ({ data = [], color = '#4F46E5', width = 80, height = 32 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || data.length < 2) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const x = d3.scaleLinear().domain([0, data.length - 1]).range([2, width - 2]);
    const y = d3.scaleLinear().domain([d3.min(data) * 0.9, d3.max(data) * 1.1]).range([height - 2, 2]);

    const area = d3.area()
      .x((_, i) => x(i))
      .y0(height)
      .y1(d => y(d))
      .curve(d3.curveBasis);

    const line = d3.line()
      .x((_, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveBasis);

    // Gradient fill
    const gradId = `spark-grad-${Math.random().toString(36).slice(2)}`;
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', gradId).attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.2);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);

    svg.append('path').datum(data).attr('d', area).attr('fill', `url(#${gradId})`);
    svg.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5);
    svg.append('circle').attr('cx', x(data.length - 1)).attr('cy', y(data[data.length - 1])).attr('r', 2.5).attr('fill', color);
  }, [data, color, width, height]);

  return <svg ref={svgRef} width={width} height={height} className="overflow-visible" />;
};

// ============================================================================
// Assessment Activity — Area/Line chart
// ============================================================================
export const AssessmentActivityChart = ({ roles = [] }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  // Generate data from roles or mock
  const generateData = () => {
    const now = new Date();
    const days = 30;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      const completed = roles.filter(r => r.date === dayStr && r.status === 'Completed').length;
      const scheduled = roles.filter(r => r.date === dayStr).length;
      data.push({
        date,
        completed: completed || Math.floor(Math.random() * 3),
        inProgress: Math.floor(Math.random() * 2),
        scheduled: scheduled || Math.floor(Math.random() * 4)
      });
    }
    return data;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const data = generateData();
    const container = containerRef.current;
    const { width: cw } = container.getBoundingClientRect();
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = cw - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', cw).attr('height', 240);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width]);

    const maxY = d3.max(data, d => Math.max(d.completed, d.inProgress, d.scheduled)) || 5;
    const y = d3.scaleLinear().domain([0, maxY + 2]).range([height, 0]);

    // Grid lines
    g.append('g').attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .enter().append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#F1F5F9').attr('stroke-width', 1);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %d')))
      .selectAll('text').attr('fill', '#94A3B8').attr('font-size', '11px');
    g.selectAll('.domain').remove();
    g.selectAll('.tick line').attr('stroke', '#E2E8F0');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
      .selectAll('text').attr('fill', '#94A3B8').attr('font-size', '11px');

    const series = [
      { key: 'completed', color: '#10B981', label: 'Completed' },
      { key: 'inProgress', color: '#3B82F6', label: 'In Progress' },
      { key: 'scheduled', color: '#8B5CF6', label: 'Scheduled' }
    ];

    series.forEach(({ key, color }) => {
      // Area
      const areaGen = d3.area()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d[key]))
        .curve(d3.curveMonotoneX);

      const gradId = `area-grad-${key}`;
      const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
      const grad = defs.append('linearGradient').attr('id', gradId).attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.15);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);

      g.append('path')
        .datum(data)
        .attr('fill', `url(#${gradId})`)
        .attr('d', areaGen)
        .attr('opacity', 0)
        .transition().duration(600).attr('opacity', 1);

      // Line
      const lineGen = d3.line()
        .x(d => x(d.date))
        .y(d => y(d[key]))
        .curve(d3.curveMonotoneX);

      const path = g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', lineGen);

      const totalLength = path.node().getTotalLength();
      path.attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition().duration(800).ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
    });

    // Hover vertical line + tooltip
    const hoverLine = g.append('line')
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', '#CBD5E1').attr('stroke-width', 1).attr('stroke-dasharray', '4,4')
      .style('opacity', 0);

    const hoverDots = series.map(({ color }) =>
      g.append('circle').attr('r', 4).attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 2).style('opacity', 0)
    );

    const tooltip = d3.select(tooltipRef.current);

    g.append('rect')
      .attr('width', width).attr('height', height)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const bisect = d3.bisector(d => d.date).left;
        const idx = Math.min(bisect(data, date), data.length - 1);
        const d = data[idx];
        if (!d) return;

        hoverLine.attr('x1', x(d.date)).attr('x2', x(d.date)).style('opacity', 1);
        hoverDots.forEach((dot, i) => {
          dot.attr('cx', x(d.date)).attr('cy', y(d[series[i].key])).style('opacity', 1);
        });

        tooltip.style('opacity', 1)
          .style('left', `${x(d.date) + margin.left + 12}px`)
          .style('top', `${y(d.completed) + margin.top - 10}px`)
          .html(`
            <div style="font-size:11px;font-weight:600;color:#0F172A;margin-bottom:4px">${d3.timeFormat('%b %d')(d.date)}</div>
            ${series.map(s => `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#64748B"><span style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block"></span>${s.label}: <strong style="color:#0F172A">${d[s.key]}</strong></div>`).join('')}
          `);
      })
      .on('mouseleave', () => {
        hoverLine.style('opacity', 0);
        hoverDots.forEach(dot => dot.style('opacity', 0));
        tooltip.style('opacity', 0);
      });

    // Resize observer
    const observer = new ResizeObserver(() => {
      // Re-render on resize by calling this effect cleanup and re-run
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [roles]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg z-10"
        style={{ opacity: 0, transition: 'opacity 150ms' }}
      />
    </div>
  );
};

// ============================================================================
// Assessment Pipeline — Horizontal funnel
// ============================================================================
export const AssessmentPipeline = ({ students = [] }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const totalStudents = students.length || 128;
  const stages = [
    { label: 'Registered', count: totalStudents, color: '#4F46E5' },
    { label: 'Aptitude', count: Math.round(totalStudents * 0.875), color: '#6366F1' },
    { label: 'Technical', count: Math.round(totalStudents * 0.734), color: '#7C3AED' },
    { label: 'AI Interview', count: Math.round(totalStudents * 0.594), color: '#8B5CF6' },
    { label: 'HR', count: Math.round(totalStudents * 0.477), color: '#A78BFA' },
    { label: 'Completed', count: Math.round(totalStudents * 0.375), color: '#10B981' }
  ];

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const { width: cw } = container.getBoundingClientRect();
    const margin = { top: 10, right: 20, bottom: 10, left: 100 };
    const width = cw - margin.left - margin.right;
    const barHeight = 28;
    const gap = 8;
    const totalHeight = stages.length * (barHeight + gap) + margin.top + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', cw).attr('height', totalHeight);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, stages[0].count]).range([0, width]);

    stages.forEach((stage, i) => {
      const y = i * (barHeight + gap);
      const pct = Math.round((stage.count / stages[0].count) * 100);

      // Label
      g.append('text')
        .attr('x', -8).attr('y', y + barHeight / 2 + 1)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', '#334155').attr('font-size', '12px').attr('font-weight', '500')
        .text(stage.label);

      // Background bar
      g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', width).attr('height', barHeight)
        .attr('rx', 6).attr('fill', '#F1F5F9');

      // Value bar with animation
      g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', 0).attr('height', barHeight)
        .attr('rx', 6).attr('fill', stage.color)
        .attr('opacity', 0.85)
        .transition().duration(600).delay(i * 80)
        .attr('width', x(stage.count));

      // Count + percentage text
      g.append('text')
        .attr('x', Math.max(x(stage.count) - 8, 30)).attr('y', y + barHeight / 2 + 1)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', '#fff').attr('font-size', '11px').attr('font-weight', '600')
        .text(`${stage.count}`)
        .attr('opacity', 0)
        .transition().duration(400).delay(i * 80 + 300)
        .attr('opacity', 1);

      g.append('text')
        .attr('x', x(stage.count) + 8).attr('y', y + barHeight / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#94A3B8').attr('font-size', '11px')
        .text(`${pct}%`)
        .attr('opacity', 0)
        .transition().duration(400).delay(i * 80 + 300)
        .attr('opacity', 1);
    });
  }, [students]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
};

// ============================================================================
// Agent Performance — Grouped bar chart
// ============================================================================
export const AgentPerformanceChart = () => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const agents = ['Technical', 'Coding', 'Communication', 'Behavioral', 'HR'];
  const metrics = ['Accuracy', 'Consistency', 'Candidate Score'];
  const colors = ['#4F46E5', '#7C3AED', '#10B981'];

  const data = agents.map(agent => ({
    agent,
    Accuracy: 75 + Math.random() * 20,
    Consistency: 70 + Math.random() * 25,
    'Candidate Score': 65 + Math.random() * 30
  }));

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const { width: cw } = container.getBoundingClientRect();
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = cw - margin.left - margin.right;
    const height = 220 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', cw).attr('height', 220);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(agents).range([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(metrics).range([0, x0.bandwidth()]).padding(0.1);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    const colorScale = d3.scaleOrdinal().domain(metrics).range(colors);

    // Grid
    g.selectAll('.grid-line')
      .data(y.ticks(5))
      .enter().append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#F1F5F9');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .selectAll('text').attr('fill', '#64748B').attr('font-size', '11px');
    g.selectAll('.domain').remove();

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`))
      .selectAll('text').attr('fill', '#94A3B8').attr('font-size', '10px');

    const tooltip = d3.select(tooltipRef.current);

    data.forEach(d => {
      metrics.forEach(metric => {
        g.append('rect')
          .attr('x', x0(d.agent) + x1(metric))
          .attr('y', height)
          .attr('width', x1.bandwidth())
          .attr('height', 0)
          .attr('rx', 3)
          .attr('fill', colorScale(metric))
          .attr('opacity', 0.85)
          .on('mouseover', function(event) {
            d3.select(this).attr('opacity', 1);
            tooltip.style('opacity', 1)
              .style('left', `${event.offsetX + 12}px`)
              .style('top', `${event.offsetY - 10}px`)
              .html(`<div style="font-size:11px;font-weight:600;color:#0F172A">${d.agent} Agent</div><div style="font-size:11px;color:#64748B">${metric}: <strong style="color:#0F172A">${d[metric].toFixed(1)}%</strong></div>`);
          })
          .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.85);
            tooltip.style('opacity', 0);
          })
          .transition().duration(500).delay(agents.indexOf(d.agent) * 60)
          .attr('y', y(d[metric]))
          .attr('height', height - y(d[metric]));
      });
    });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />
      <div ref={tooltipRef} className="absolute pointer-events-none bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg z-10" style={{ opacity: 0, transition: 'opacity 150ms' }} />
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-2">
        {metrics.map((m, i) => (
          <div key={m} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[i] }} />
            <span className="text-[11px] text-slate-500">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Candidate Readiness — Donut chart
// ============================================================================
export const CandidateReadinessChart = ({ students = [] }) => {
  const svgRef = useRef(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const size = 180;
  const radius = size / 2;
  const innerRadius = radius * 0.65;

  const total = students.length || 100;
  const segments = [
    { label: 'Ready', value: Math.round(total * 0.64), color: '#10B981' },
    { label: 'Needs Preparation', value: Math.round(total * 0.26), color: '#F59E0B' },
    { label: 'At Risk', value: Math.round(total * 0.10), color: '#EF4444' }
  ];

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);
    const pie = d3.pie().value(d => d.value).sort(null).padAngle(0.03);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius).cornerRadius(4);
    const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 4).cornerRadius(4);

    const arcs = g.selectAll('.arc')
      .data(pie(segments))
      .enter().append('g').attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#fff').attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(_, d) {
        d3.select(this).transition().duration(200).attr('d', arcHover);
        setActiveSlice(d.data);
      })
      .on('mouseout', function() {
        d3.select(this).transition().duration(200).attr('d', arc);
        setActiveSlice(null);
      })
      .transition().duration(600)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return t => arc(interpolate(t));
      });

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle').attr('dy', '-0.2em')
      .attr('fill', '#0F172A').attr('font-size', '24px').attr('font-weight', '700')
      .text(`${Math.round((segments[0].value / total) * 100)}%`);

    g.append('text')
      .attr('text-anchor', 'middle').attr('dy', '1.2em')
      .attr('fill', '#64748B').attr('font-size', '12px').attr('font-weight', '500')
      .text('Ready');
  }, [students]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef} width={size} height={size} className="overflow-visible" />
      <div className="mt-4 space-y-2 w-full">
        {segments.map(seg => (
          <div key={seg.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${activeSlice?.label === seg.label ? 'bg-slate-50' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[13px] text-slate-600">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-800">{seg.value}</span>
              <span className="text-[11px] text-slate-400">{Math.round((seg.value / total) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Student Group Distribution — Horizontal bar chart
// ============================================================================
export const StudentGroupChart = ({ studentGroups = [], students = [] }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  // Add unassigned count
  const unassignedCount = students.filter(s => !s.groupIds || s.groupIds.length === 0).length;
  const allGroups = [
    ...studentGroups.map(g => ({
      name: g.name,
      count: g.studentCount || students.filter(s => (s.groupIds || []).includes(g._id)).length,
      color: g.color
    })),
    ...(unassignedCount > 0 ? [{ name: 'Unassigned', count: unassignedCount, color: '#94A3B8' }] : [])
  ];

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || allGroups.length === 0) return;
    const container = containerRef.current;
    const { width: cw } = container.getBoundingClientRect();
    const margin = { top: 8, right: 60, bottom: 8, left: 100 };
    const width = cw - margin.left - margin.right;
    const barHeight = 26;
    const gap = 6;
    const totalHeight = allGroups.length * (barHeight + gap) + margin.top + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', cw).attr('height', totalHeight);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const maxCount = d3.max(allGroups, d => d.count) || 1;
    const x = d3.scaleLinear().domain([0, maxCount]).range([0, width]);
    const tooltip = d3.select(tooltipRef.current);

    allGroups.forEach((group, i) => {
      const y = i * (barHeight + gap);

      g.append('text')
        .attr('x', -8).attr('y', y + barHeight / 2 + 1)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', '#334155').attr('font-size', '12px').attr('font-weight', '500')
        .text(group.name);

      g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', width).attr('height', barHeight)
        .attr('rx', 5).attr('fill', '#F8FAFC');

      g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', 0).attr('height', barHeight)
        .attr('rx', 5).attr('fill', group.color).attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          d3.select(this).attr('opacity', 1);
          tooltip.style('opacity', 1)
            .style('left', `${event.offsetX + 12}px`)
            .style('top', `${event.offsetY - 10}px`)
            .html(`<div style="font-size:11px;font-weight:600;color:#0F172A">${group.name}</div><div style="font-size:11px;color:#64748B">${group.count} students</div>`);
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 0.8);
          tooltip.style('opacity', 0);
        })
        .transition().duration(500).delay(i * 60)
        .attr('width', x(group.count));

      g.append('text')
        .attr('x', x(group.count) + 8).attr('y', y + barHeight / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#64748B').attr('font-size', '12px').attr('font-weight', '600')
        .text(group.count)
        .attr('opacity', 0)
        .transition().duration(300).delay(i * 60 + 300)
        .attr('opacity', 1);
    });
  }, [studentGroups, students]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />
      <div ref={tooltipRef} className="absolute pointer-events-none bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg z-10" style={{ opacity: 0, transition: 'opacity 150ms' }} />
    </div>
  );
};
