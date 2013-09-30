(function() {

    var G = window.k.graph;

    /* Draws several lines on a graph, based on some data and some specs. */
    d3.chart('Base').extend('SpecLines', {
        initialize: function() {
            var TRANS_TIME = 600;

            var lineBase = this.svg.append('g')
                .classed('lines', true);
            var axesBase = this.svg.append('g')
                .classed('axes', true);

            this.scaleX = d3.scale.linear();
            this.scaleY = d3.scale.linear();

            var zeroLine = d3.svg.line()
                .x(G.compose(G.get(0), this.scaleX))
                .y(this.scaleY.bind(null, 0));

            var line = d3.svg.line()
                .x(G.compose(G.get(0), this.scaleX))
                .y(G.compose(G.get(1), this.scaleY));

            var d3Dummy = G.compose(G.popThis, d3.select);

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
                            elem.call(axis)
                                .attr('transform', G.format('translate({0},{1})', tx, ty));
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
                            elem.duration(TRANS_TIME)
                                .attr('transform', G.format('translate({0},{1})', tx, ty))
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

})();
