(function() {
    window.k = window.k || {};
    window.k.graph = window.k.graph || {};

    var G = window.k.graph;

    // Some helper functions

    /* Create a function that gets `key` from it's first argument.
     *
     * This will cache functions with the same key. In other words:
     *
     *     var a = get('foo');
     *     var b = get('foo');
     *     a === b;   // True
     */
    G.get = (function() {
        var cache = {};

        return function(key) {
            if (!(key in cache)) {
                cache[key] = function(d) {
                    return d[key];
                };
            }
            return cache[key];
        };
    })();

    /* A function that return's it's first argument. */
    G.ident = function(d) {
        return d;
    };

    /* Create a chainable, d3-style property.
     *
     * Use this like:
     *
     *   var foo = {
     *     bar: property(5),
     *   };
     *   foo.bar();  // returns 5
     *   foo.bar(6); // returns foo
     *   foo.bar();  // returns 6
     *
     * :arg def: Default, if no value is set.
     * :arg callback: Function to call when a new value is set.
     */
    G.property = function(def, callback) {
        var store = def;
        callback = callback || G.ident;

        return function(newVal) {
            if (arguments.length === 0) {
                return store;
            }
            setTimeout(callback.bind(this, newVal), 0);
            store = newVal;
            return this;
        };
    }; 

    /* Create a function that composes each argument passed as a parameter.
     *
     * `compose(a, b)(1)` is equivalent to `b(a(1))`.
     */
    G.compose = function(/* funcs */) {
        var funcs = Array.prototype.slice.call(arguments);
        return function(d, i) {
            var res = d;
            funcs.forEach(function(func) {
                res = func(res, i);
            });
            return res;
        };
    }

    /* Create a function that sums functors.
     *
     * `add(a, b)(1)` is equivalent to `a(1) + b(1)`.
     * `add(a, 2)(1)` is equivalent to `a(1) + 2`.
     */
    G.add = function(/* funcs */) {
        var functors = Array.prototype.map.call(arguments, d3.functor);
        return function(d, i) {
            var sum = 0;
            functors.forEach(function(f) {
                sum += f(d, i);
            });
            return sum;
        };
    }

    /* Create a function that multiplies functors.
     *
     * `multiply(a, b, c)(2)` is equivalent to `a(2) * b(2) * c(2)`.
     * `multiply(a, b, 2)(3)` is equivalent to `a(3) * b(3) * 2`.
     */
    G.multiply = function(/* funcs */) {
        var functors = Array.prototype.map.call(arguments, d3.functor);
        return function(d, i) {
            var product = 1;
            functors.forEach(function(f) {
                product *= f(d, i);
            });
            return product;
        };
    }

    /* Returns it's second argument. 
     * 
     * Intended for use in places where d3 passes the current index as
     * the second argument.
     */
    G.index = function(d, i) {
        return i;
    }


    // Graph builders

    d3.chart('SpecLines', {
        initialize: function() {
            var TRANS_TIME = 600;

            var svg = this.base.append('svg');
            var background = svg.append('g')
                .classed('bg', true);
            var lineBase = svg.append('g')
                .classed('lines', true);
            var axesBase = svg.append('g')
                .classed('axes', true);

            this.scaleX = d3.scale.linear();
            this.scaleY = d3.scale.linear();

            var zeroLine = d3.svg.line()
                .x(G.compose(G.get(0), this.scaleX))
                .y(this.scaleY.bind(null, 0));

            var line = d3.svg.line()
                .x(G.compose(G.get(0), this.scaleX))
                .y(G.compose(G.get(1), this.scaleY));

            function d3Dummy() {
                return d3.select(this);
            }

            this.layer('svg', svg, {
                dataBind: function(data) {
                    var chart = this.chart();
                    svg.transition()
                       .duration(TRANS_TIME)
                       .attr('width', chart.width())
                       .attr('height', chart.height());
                    return svg.data([]);
                },
                insert: d3Dummy,
                events: {
                    enter: d3Dummy,
                }
            });

            this.layer('background', background, {
                dataBind: function(data) {
                    var chart = this.chart();
                    return this
                        .append('rect')
                        .attr('width', chart.width())
                        .attr('height', chart.height())
                        .attr('fill', '#eee')
                        .data([]);
                },
                insert: d3Dummy,
                events: {
                    enter: d3Dummy,
                }
            });

            this.layer('axes', axesBase, {
                dataBind: function(data) {
                    var chart = this.chart();
                    return this.selectAll('g.axis').data([
                        d3.svg.axis()
                            .scale(chart.scaleY)
                            .orient('left')
                            .ticks(4)
                            .tickSize(1),
                        d3.svg.axis()
                            .scale(chart.scaleX)
                            .orient('bottom')
                            .ticks(10)
                            .tickSize(1),
                    ]);
                },
                insert: function() {
                    return this.append('g')
                        .classed('axis', true)
                },
                events: {
                    enter: function() {
                        var chart = this.chart();

                        this.each(function(axis) {
                            var elem = d3.select(this);
                            var tx = 0;
                            var ty = 0;
                            if (axis.orient() === 'left') {
                                tx = 30;
                            } else if (axis.orient() === 'bottom') {
                                ty = chart.height() - 30;
                            }
                            elem.attr('transform', 'translate(' + tx + ', ' + ty + ')')
                                .call(axis);
                        });
                    },
                    'update:transition': function() {
                        var chart = this.chart();

                        this.each(function(axis) {
                            var elem = d3.select(this);
                            var tx = 0;
                            var ty = 0;
                            if (axis.orient() === 'left') {
                                tx = 30;
                            } else if (axis.orient() === 'bottom') {
                                ty = chart.height() - 30;
                            }
                            elem.transition()
                                .duration(TRANS_TIME)
                                .attr('transform', 'translate(' + tx + ', ' + ty + ')')
                                .call(axis);
                        });
                    },
                }
            });

            this.layer('lines', lineBase, {
                dataBind: function(data) {
                    return this.selectAll('path').data(data);
                },
                insert: function() {
                    return this.append('path')
                        .attr('strokeWidth', 2)
                        .attr('fill', 'none');
                },
                events: {
                    enter: function() {
                        return this
                            .attr('d', G.compose(G.get('points'), zeroLine))
                            .attr('stroke', '#000');
                    },
                    'enter:transition': function() {
                        return this
                            .delay(function(d, i) { return i * 200; })
                            .duration(TRANS_TIME)
                            .attr('d', G.compose(G.get('points'), line))
                            .attr('stroke', G.get('stroke'));
                    },
                    'update:transition': function() {
                        return this
                            .duration(TRANS_TIME)
                            .attr('d', G.compose(G.get('points'), line))
                            .attr('stroke', G.get('stroke'));
                    },
                },
            });
        },

        width: G.property(1000),
        height: G.property(400),
        padding: G.property([5, 0, 30, 30]),
        specs: G.property([]),

        /* This is called at the beginning .draw(), and is the last chance
         * to fiddle with the data. It will be called right before any of the
         * layers' dataBind methods, and the return value will be the argument
         * to those functions. */
        transform: function(data) {
            var minX = Infinity;
            var maxX = -Infinity;
            var minY = 0;
            var maxY = -Infinity;

            var speccedData = this.specs().map(function(spec) {
                return {
                    stroke: spec.stroke || '#000',
                    name: spec.name,
                    points: data.map(function(d) {
                        var x = spec.x(d);
                        var y = spec.y(d);
                        minX = Math.min(minX, x);
                        maxX = Math.max(minX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                        return [x, y];
                    })
                };
            });

            var left = this.padding()[3];
            var right = this.width() - this.padding()[1];
            var top = this.padding()[0];
            var bottom = this.height() - this.padding()[2];

            this.scaleX
                .range([left, right])
                .domain([minX, maxX]);
            this.scaleY
                .range([bottom, top])
                .domain([minY, maxY]);

            return speccedData;
        },

    });


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
    d3.chart('CalendarHeatMap', {
        initialize: function() {
            var TRANS_TIME = 700;

            var svg = this.base.append('svg');
            var daysBase = svg.append('g')
                .classed('days', true);
            var xAxisBase = svg.append('g')
                .classed('x axis', true);
            var yAxisBase = svg.append('g')
                .classed('y axis', true);

            this.numScale = d3.scale.linear();
            this.cellScaleX = d3.scale.linear();
            this.cellScaleY = d3.scale.linear();
            this.colorScale = d3.scale.linear();

            function d3Dummy() {
                return d3.select(this);
            }

            function xIndex(d) {
                return Math.floor(this.numScale(d.date) / 7);
            }
            xIndex = xIndex.bind(this);

            function yIndex(d) {
                return this.numScale(d.date) % 7;
            }
            yIndex = yIndex.bind(this);

            this.layer('svg', svg, {
                dataBind: function(data) {
                    var chart = this.chart();
                    svg.transition().duration(TRANS_TIME)
                        .attr('width', chart.width())
                        .attr('height', chart.height());
                    return svg.data([]);
                },
                insert: d3Dummy,
                events: {
                    enter: d3Dummy,
                }
            });

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
                            .attr('transform', function(d) {
                                var x = chart.cellScaleX(xIndex(d));
                                var y = chart.cellScaleY(yIndex(d));
                                return 'translate(' + x + ',' + y + ')';
                            });
                    },
                    'update:transition': function() {
                        var chart = this.chart();
                        return this.transition()
                            .duration(TRANS_TIME)
                            .attr('fill', G.compose(G.get('heat'), chart.colorScale))
                            .attr('transform', function(d) {
                                var x = chart.cellScaleX(xIndex(d));
                                var y = chart.cellScaleY(yIndex(d));
                                return 'translate(' + x + ',' + y + ')';
                            })
                            .attr('width', chart.cellSize)
                            .attr('height', chart.cellSize)
                    },
                    'exit:transition': function() {
                        this.transition()
                            .duration(TRANS_TIME / 2)
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
                            .duration(TRANS_TIME)
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
                        this.transition().duration(TRANS_TIME)
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
