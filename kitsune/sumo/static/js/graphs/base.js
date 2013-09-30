(function() {

    var G = window.k.graph;

    /* Draws several lines on a graph, based on some data and some specs. */
    d3.chart('Base', {
        initialize: function() {
            this.base.style('position', 'relative');

            this.svg = this.base.append('svg')
                .style('pointer-events', 'all');

            var d3Dummy = G.compose(G.popThis, d3.select);

            this.layer('svg', this.svg, {
                dataBind: function(data) {
                    var chart = this.chart();
                    this.transition()
                       .duration(chart.transitionTime())
                       .attr('width', chart.width())
                       .attr('height', chart.height());
                    return this.data([]);
                },
                insert: d3Dummy,
                events: {
                    enter: d3Dummy,
                }
            });
        },

        width: G.property(600),
        height: G.property(400),
        padding: G.property([0, 0, 0, 0]),
        transitionTime: G.property(700),
    });

})();
