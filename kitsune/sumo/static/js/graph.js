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

    // Graph builders

    d3.chart('TimeSeries', {
        initialize: function() {
            var svg = this.base.append('svg');

            var lineBase = svg.append('g')
                .classed('timeseries-line', true);

            this.scaleX = d3.scale.linear();
            this.scaleY = d3.scale.linear();

            var zeroLine = d3.svg.line()
                .x(G.compose(G.get(0), this.scaleX))
                .y(this.scaleY.bind(null, 0));

            var line = d3.svg.line()
                .x(G.compose(G.get(0), this.scaleX))
                .y(G.compose(G.get(1), this.scaleY));

            this.layer('lines', lineBase, {
                dataBind: function(data) {
                    return this.selectAll('path').data(data)
                },
                insert: function() {
                    var chart = this.chart();

                    svg.attr('height', chart.height())
                        .attr('width', chart.width());

                    return this.append('path')
                        .attr('strokeWidth', 2)
                        .attr('fill', 'none');
                },
                events: {
                    'enter': function() {
                        // return this.attr('d', G.compose(G.get('points'), line));
                        return this
                            .attr('d', G.compose(G.get('points'), zeroLine))
                            .attr('stroke', '#000');
                    },
                    'enter:transition': function() {
                        return this
                            .delay(function(d, i) { return i * 200; })
                            .duration(700)
                            .attr('d', G.compose(G.get('points'), line))
                            .attr('stroke', G.get('stroke'));
                    }
                }
            });
        },

        width: G.property(1000),
        height: G.property(400),
        specs: G.property([]),

        /* This is called at the beginning .draw(), and is the last chance
         * to fiddle with the data. It will be called right before any of the
         * layers' databind methods, and the return value will be the argument
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

            this.scaleX
                .range([0, this.width()])
                .domain([minX, maxX]);
            this.scaleY
                .range([this.height(), 0])
                .domain([minY, maxY]);

            return speccedData;
        },

    });

})();
