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
        return function(d) {
            var res = d;
            funcs.forEach(function(func) {
                res = func(res);
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
        return function(d) {
            var sum = 0;
            functors.forEach(function(f) {
                sum += f(d);
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
        return function(d) {
            var product = 1;
            functors.forEach(function(f) {
                product *= f(d);
            });
            return product;
        };
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
                        {
                            axis: d3.svg.axis()
                                .scale(chart.scaleY)
                                .orient('left')
                                .ticks(4)
                                .tickSize(1),
                            scale: chart.scaleY,
                            orient: 'left',
                            ticks: 4,
                        },
                        {
                            axis: d3.svg.axis()
                                .scale(chart.scaleX)
                                .orient('bottom')
                                .ticks(10)
                                .tickSize(1),
                            scale: chart.scaleX,
                            orient: 'bottom',
                            ticks: 10,
                        },
                    ]);
                },
                insert: function() {
                    return this.append('g')
                        .classed('axis', true)
                },
                events: {
                    enter: function() {
                        var chart = this.chart();

                        this.each(function(d) {
                            var elem = d3.select(this);
                            var tx = 0;
                            var ty = 0;
                            if (d.orient === 'left') {
                                tx = 30;
                            } else if (d.orient === 'bottom') {
                                ty = chart.height() - 30;
                            }
                            elem.attr('transform', 'translate(' + tx + ', ' + ty + ')')
                                .call(d.axis);
                        });
                    },
                    'update:transition': function() {
                        var chart = this.chart();

                        this.each(function(d) {
                            var elem = d3.select(this);
                            var tx = 0;
                            var ty = 0;
                            if (d.orient === 'left') {
                                tx = 30;
                            } else if (d.orient === 'bottom') {
                                ty = chart.height() - 30;
                            }
                            elem.transition()
                                .duration(TRANS_TIME)
                                .attr('transform', 'translate(' + tx + ', ' + ty + ')')
                                .call(d.axis);
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

})();
