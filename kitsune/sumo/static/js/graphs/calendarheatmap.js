(function() {
    var G = window.k.graph;

    /* A Github Profile style calendar heatmap.
     *
     * Arranged as columns of 7 days (to match a week), with a configurable
     * gap.
     *
     * Configurable Properties:
     * - width: Width of the entire svg. Default 700.
     * - height: Height of the entire svg. Default 100.
     * - cellGap: The spacing between cells. Default 1.
     */
    d3.chart('Base').extend('CalendarHeatMap', {
        initialize: function() {
            var tooltip = this.base.append('div')
                .style('opacity', '0.0')
                .style('position', 'absolute')
                .style('background', '#ddd')
                .style('padding', '10px')
                .style('pointer-events', 'none')
                .style('top', 0)
                .style('left', 0);

            var daysBase = this.svg.append('g')
                .classed('days', true);
            var xAxisBase = this.svg.append('g')
                .classed('x axis', true);
            var yAxisBase = this.svg.append('g')
                .classed('y axis', true);

            this.numScale = d3.scale.linear();
            this.cellScaleX = d3.scale.linear();
            this.cellScaleY = d3.scale.linear();
            this.colorScale = d3.scale.linear();

            d3.select('body').on('mousemove', function(d, i) {
                var mouse = d3.mouse(daysBase[0][0]);
                if (mouse[0] < 0 || mouse[0] > this.width() ||
                    mouse[1] < 0 || mouse[1] > this.height()) {

                    tooltip.transition().duration(100)
                        .style('opacity', '0.0')
                        .style('transform', 'translate(0,0)');
                }
            }.bind(this));

            d3Dummy = G.compose(G.popThis, d3.select);

            function xIndex(d) {
                return Math.floor(this.numScale(d.date) / 7);
            }
            xIndex = xIndex.bind(this);

            function yIndex(d) {
                return this.numScale(d.date) % 7;
            }
            yIndex = yIndex.bind(this);

            this.layer('days', daysBase, {
                dataBind: function(data) {
                    return this.selectAll('rect').data(data);
                },
                insert: function() {
                    var chart = this.chart();
                    return this.append('rect')
                        .attr('width', chart.cellSize)
                        .attr('height', chart.cellSize);
                },
                events: {
                    enter: function() {
                        var chart = this.chart();

                        return this
                            .attr('fill', G.compose(G.get('heat'), chart.colorScale))
                            .attr('width', chart.cellSize)
                            .attr('height', chart.cellSize)

                            .attr('transform', G.format('translate({0},{1})',
                                G.compose(xIndex, chart.cellScaleX),
                                G.compose(yIndex, chart.cellScaleY)))

                            .on('mouseover', function(d, i) {
                                var elem = d3.select(this);
                                var trans = elem.attr('transform');
                                var match = /.*translate\((.*)\).*/.exec(trans);
                                console.log(trans, match);
                                if (match) {
                                    match = match[1].split(',');
                                    var x = parseInt(match[0]) - chart.cellSize / 2;
                                    var y = parseInt(match[1]) + chart.cellSize * 1.25;

                                    tooltip
                                        .text(d3.time.format('%B %d, %Y')(d.date))
                                        .style('opacity', '1.0')
                                        .style('transform', G.format('translate({0},{1})', x, y));
                                }
                            });
                    },
                    'update:transition': function() {
                        var chart = this.chart();
                        return this.transition()
                            .duration(chart.transitionTime())
                            .attr('fill', G.compose(G.get('heat'), chart.colorScale))
                            .attr('width', chart.cellSize)
                            .attr('height', chart.cellSize)
                            .attr('transform', G.format('translate({0},{1})',
                                G.compose(xIndex, chart.cellScaleX),
                                G.compose(yIndex, chart.cellScaleY)))
                    },
                    'exit:transition': function() {
                        this.transition()
                            .duration(chart.transitionTime() / 2)
                            .attr('width', 0)
                            .attr('opacity', 0.0)
                            .remove();
                    }
                }
            });

            this.layer('xAxis', xAxisBase, {
                dataBind: function(data) {
                    var chart = this.chart();

                    var dates = d3.extent(data, G.get('date'));
                    var firstMonth = new Date(dates[0].getFullYear(), dates[0].getMonth() + 1, 1);
                    var lastMonth = new Date(dates[1].getFullYear(), dates[1].getMonth(), 1);

                    var months = [];
                    var month = firstMonth;
                    while (month <= lastMonth) {
                        months.push(month);
                        month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
                    }

                    return this
                        .attr('width', chart.width())
                        .attr('height', 20)
                        .selectAll('text')
                            .data(months);
                },
                insert: function() {
                    return this.append('text')
                        .classed('x label', true)
                        .style('font-family', 'sans');
                },
                events: {
                    'enter': function() {
                        var chart = this.chart();
                        this.text(d3.time.format('%b'))
                            .style('font-size', chart.cellSize + 'px')
                            .attr('y', chart.cellSize * 0.8)
                            .attr('x', function(d) {
                                return chart.cellScaleX(xIndex({date: d})) + 1;
                            })
                    },
                    'update:transition': function() {
                        var chart = this.chart();
                        this.transition()
                            .duration(chart.transitionTime())
                            .style('font-size', chart.cellSize + 'px')
                            .attr('y', chart.cellSize * 0.8)
                            .attr('x', function(d) {
                                return chart.cellScaleX(xIndex({date: d})) + 1;
                            })
                    },
                }
            });

            this.layer('yAxis', yAxisBase, {
                dataBind: function(data) {
                    var chart = this.chart();

                    return this.selectAll('text')
                        .data(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
                },
                insert: function() {
                    return this.append('text')
                        .classed('y label', true)
                        .style('text-anchor', 'middle')
                        .style('font-family', 'sans');
                },
                events: {
                    enter: function() {
                        var chart = this.chart();
                        this.text(G.ident)
                            .attr('x', 4)
                            .attr('y', G.compose(G.add(G.index, 0.75), chart.cellScaleY))
                            .style('font-size', (chart.cellSize * 0.75) + 'px');
                    },
                    'update:transition': function() {
                        var chart = this.chart();
                        this.transition().duration(chart.transitionTime())
                            .attr('x', chart.cellSize / 2)
                            .attr('y', G.compose(G.add(G.index, 0.75), chart.cellScaleY))
                            .style('font-size', (chart.cellSize * 0.75) + 'px')
                    },
                    exit: function() {
                        this.remove();
                    }
                }
            });
        },

        transform: function(data) {
            // Figure out the biggest cell that will fit.
            this.cellSize = Math.floor(Math.min(
                // Vertical fit. 7 cells, 6 gaps, and one more imaginary
                // one on the edges.
                (this.height() - this.cellGap() * 7) / 8,
                // Horizontal fit.
                this.width() / (data.length / 8) - this.cellGap()
            ));

            // These scales are smaller than the data. That's fine,
            // d3.scale.linear will extrapolate.
            var lowestDate = d3.min(data, G.get('date'));
            this.numScale
                .domain([lowestDate, +lowestDate + 24 * 60 * 60 * 1000])
                .range([lowestDate.getDay(), lowestDate.getDay() + 1]);
            // These start from -1 so that there is an extra empty cell
            // to place text in.
            this.cellScaleX
                .domain([-1, 0])
                .range([0, this.cellSize + this.cellGap()])
            this.cellScaleY
                .domain([-1, 0])
                .range([0, this.cellSize + this.cellGap()])
            this.colorScale
                .domain([0, 1])
                .range(['rgba(0, 0, 255, 0.1)', 'rgba(0, 0, 255, 1.0)']);

            return data;
        },

        width: G.property(700),
        height: G.property(100),
        cellGap: G.property(1),
    });

})();
