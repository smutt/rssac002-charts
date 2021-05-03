/* Copyright Andrew McConachie <andrew@depht.com> 2021 */

// Summation function for dirty data
// Treat null as zero and ignore non-numbers
function sum_nulls(){
  var rv = 0;
  for(var ii = 0; ii < arguments.length; ii++){
    if(arguments[ii] != null){
      if(typeof(arguments[ii]) == 'number'){
        rv += arguments[ii];
      }
    }
  }
  return rv;
}

$(document).ready(function() {
  rssac002_update_chart();
});

function rssac002_update_chart(){
  var options = {
    chart: {
      renderTo: 'container',
      type: 'line',
      zoomType: 'x'
    },
    title: {
        text: ''
    },
    subtitle: {
        text: 'Source: RSSAC002 Data'
    },
    xAxis: {
      type: 'datetime',
      title: {
        text: null
      },
    },
    yAxis: {
      title: {
        text: 'Queries / Sources (log)'
      },
      type: 'logarithmic',
      /*labels: {
        formatter: function () {
          return this.value / 1000000;
        }
      }*/
    },
    plotOptions: {
      series: {
        pointStart: Date.UTC('2017', '00', '02'),  // Jan is zero'th month in JS
        //pointInterval: point_interval,
        connectNulls: true,
      },
    },
    series: [{}]
  };

  // Read some values from the HTML
  var end_date = document.getElementById('end_date').textContent;
  var chart_type = document.querySelector('input[name = "chart_type"]:checked').value;
  var time_interval = document.querySelector('input[name = "time_interval"]:checked').value;
  var ip_version = document.querySelector('input[name = "ip_version"]:checked').value;

  // Determine request JSONs
  var req_data_sources = {
    rsi: 'a-m',
    start_date: '2017-01-02',
    end_date: end_date,
  };
  var req_data_queries = Object.assign({}, req_data_sources); // deep copy
  req_data_queries.totals = 'received';
  if(time_interval == 'day'){
    var suffix_text = '';
    var denominator = 1;
    options.plotOptions.series.pointInterval = 86400000; // 1 day in ms
  }else{
    var suffix_text = '(daily average)';
    var denominator = 7;
    req_data_sources.week = true;
    req_data_queries.week = true;
    options.plotOptions.series.pointInterval = 604800000; // 1 week in ms
  }

  // Set options based on chart_type
  if(chart_type == 'mline'){
    options.legend = {
      enabled: true,
    };
  }else{ // 'line'
    options.legend = {
      enabled: false,
    };
  }

  if(ip_version == '4' || ip_version == '6'){
    options.title.text = 'Queries Received / Unique IPv' + ip_version + ' Sources by-' + time_interval + ' ' + suffix_text;
  }else{
    options.title.text = 'Queries Received / Unique IPv4 and IPv6 Sources by-' + time_interval + ' ' + suffix_text;
  }

  $.ajax({
    url: "http://rssac002.depht.com/api/v1/unique-sources",
    type: "GET",
    dataType: "json",
    data: req_data_sources,
    success: function(res_sources){
      $.ajax({
        url: "http://rssac002.depht.com/api/v1/traffic-volume",
        type: "GET",
        dataType: "json",
        data: req_data_queries,
        success: function(res_queries){
          if(chart_type == 'line'){
            var totals_sources = {}
            $.each(res_sources, function(rsi, dates){
              $.each(dates, function(date, val){
                if(!(date in totals_sources)){
                  totals_sources[date] = 0;
                }
                if(val != null){
                  if(ip_version == '4' || ip_version == '6'){
                    totals_sources[date] += sum_nulls(val['num-sources-ipv' + ip_version]) / denominator;
                  }else{
                    totals_sources[date] += sum_nulls(val['num-sources-ipv4'], val['num-sources-ipv6']) / denominator;
                  }
                }
              });
            });

            var totals_queries = {};
            $.each(res_queries, function(rsi, dates){
              $.each(dates, function(date, val){
                if(!(date in totals_queries)){
                  totals_queries[date] = 0;
                }
                if(val != null){
                  totals_queries[date] += sum_nulls(val) / denominator;
                }
              });
            });

            var points = [];
            points[0] = {};
            points[0].name = 'RSS';
            points[0].data = [];
            $.each(totals_sources, function(date, sources){
              if(sources == 0){
                points[0].data.push(Math.round(totals_queries[date] / 1)); // This should really never happen, but safety first.
              }else{
                points[0].data.push(Math.round(totals_queries[date] / sources));
              }
            });

          }else{ // chart_type == 'mline'
            var totals_sources = {}
            $.each(res_sources, function(rsi, dates){
              totals_sources[rsi] = {};
              $.each(dates, function(date, val){
                if(val == null){
                  totals_sources[rsi][date] = 0;
                }else{
                  if(ip_version == '4' || ip_version == '6'){
                    totals_sources[rsi][date] = sum_nulls(val['num-sources-ipv' + ip_version]) / denominator;
                  }else{
                    totals_sources[rsi][date] = sum_nulls(val['num-sources-ipv4'], val['num-sources-ipv6']) / denominator;
                  }
                }
              });
            });

            var totals_queries = {};
            $.each(res_queries, function(rsi, dates){
              totals_queries[rsi] = {};
              $.each(dates, function(date, val){
                if(val == null){
                  totals_queries[rsi][date] = 0;
                }else{
                  totals_queries[rsi][date] = sum_nulls(val) / denominator;
                }
              });
            });

            var points = [];
            var ii = 0;
            $.each(totals_sources, function(rsi, dates){
              points[ii] = {};
              points[ii].name = rsi;
              points[ii].data = [];
              $.each(dates, function(date, sources){
                if(sources == 0){
                  points[ii].data.push(Math.round(totals_queries[rsi][date] / 1)); // This should really never happen, but safety first.
                }else{
                  points[ii].data.push(Math.round(totals_queries[rsi][date] / sources));
                }
              });
              ii += 1;
            });
          }

          options.series = points;
          new Highcharts.Chart(options);
        }});
    }});
}
