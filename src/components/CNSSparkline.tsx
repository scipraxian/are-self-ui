import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './CNSSparkline.css';

interface CNSSparklineProps {
    data: number[];
    trend: 'improving' | 'worsening' | 'stable';
    height?: number;
}

export const CNSSparkline = ({ data, trend, height = 32 }: CNSSparklineProps) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length < 2) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svgRef.current.clientWidth;
        const h = height;
        const padding = 2;

        const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([padding, width - padding]);
        const yScale = d3.scaleLinear().domain([0, d3.max(data) || 1]).range([h - padding, padding]);

        const line = d3.line<number>()
            .x((_, i) => xScale(i))
            .y(d => yScale(d))
            .curve(d3.curveMonotoneX);

        const area = d3.area<number>()
            .x((_, i) => xScale(i))
            .y0(h)
            .y1(d => yScale(d))
            .curve(d3.curveMonotoneX);

        const colors = {
            improving: { fill: 'rgba(74, 222, 128, 0.15)', stroke: '#4ade80' },
            worsening: { fill: 'rgba(239, 68, 68, 0.15)', stroke: '#ef4444' },
            stable: { fill: 'rgba(56, 189, 248, 0.1)', stroke: '#38bdf8' },
        };
        const c = colors[trend];

        svg.append('path').datum(data).attr('d', area).attr('fill', c.fill);
        svg.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', c.stroke).attr('stroke-width', 1.5);
    }, [data, trend, height]);

    if (data.length < 2) {
        return <div className="cns-sparkline-empty">No data</div>;
    }

    return <svg ref={svgRef} className="cns-sparkline" style={{ height }} />;
};
