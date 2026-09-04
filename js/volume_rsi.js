/* Copyright Andrew McConachie <andrew@depht.com> 2021 2026 */

$(document).ready(function() {
  rssac002_update_chart();
});

function rssac002_update_chart(){
  var options = {
    chart: {
      renderTo: '',
      type: 'area',
      zoomType: 'x'
    },
    title: {
        text: ''
    },
    subtitle: {
        text: 'Source: RSSAC002 Data'
    },
    exporting: {
      filename: 'chart',
    },
    xAxis: {
      type: 'datetime',
      title: {
        text: null
      },
    },
    yAxis: {
      title: {
        text: ''
      },
      labels: {
      }
    },
    plotOptions: {
      area: {
        stacking: 'normal',
        lineColor: '#666666',
        lineWidth: 1,
        marker: {
          lineWidth: 1,
          lineColor: '#666666'
        }
      }
    },
    series: [{}]
  };

  // Read some values from the HTML
  var direction = document.getElementById('direction').textContent;
  var end_date = document.getElementById('end_date').textContent;
  var time_interval = document.querySelector('input[name = "time_interval"]:checked').value;
  var chart_y = document.querySelector('input[name = "chart_y"]:checked').value;

  // Determine request JSON based on time_interval
  if(time_interval == 'day'){
    if(chart_y == 'qps'){
      var suffix_text = 'per-second (daily average)';
      var denominator = 86400;
    }else{
      var suffix_text = 'per-day (billion)';
      var denominator = 1;
    }

    options.plotOptions.area.pointInterval =  86400000; // 1 day in ms
    var req_data = {
      rsi: 'a-m',
      start_date: '2017-01-02',
      end_date: end_date,
    };
  }else{
    if(chart_y == 'qps'){
      var suffix_text = 'per-second (weekly average)';
      var denominator = 604800; // Seconds in a week
    }else{
      var suffix_text = 'by-week (billion) (daily average)';
      var denominator = 7;
    }

    options.plotOptions.area.pointInterval = 604800000; // 1 week in ms
    var tooltip = {
      valueDecimals: 0,
      dateTimeLabelFormats: {
        week:  ["Week %W, from %A, %b %e, %Y"],
      }
    };
    options.tooltip = tooltip;
    var req_data = {
      rsi: 'a-m',
      start_date: '2017-01-02',
      end_date: end_date,
      week: true,
    };
  }

  if(chart_y == 'qps'){
    var y_suffix_text = 'per-second';
  }else{
    var y_suffix_text = '';
    options.yAxis.labels.formatter = function () { return this.value / 1000000000; };
  }

  if(direction == 'received'){
    var protocols = {
        'dns-udp-queries-received-ipv4': 'IPv4-UDP', 'dns-tcp-queries-received-ipv4': 'IPv4-TCP',
        'dns-udp-queries-received-ipv6': 'IPv6-UDP', 'dns-tcp-queries-received-ipv6': 'IPv6-TCP'
    };
    var title_str = 'Queries ';
    options.yAxis.title.text = title_str + y_suffix_text;
  }else{
    var protocols = {
        'dns-udp-responses-sent-ipv4': 'IPv4-UDP', 'dns-tcp-responses-sent-ipv4': 'IPv4-TCP',
        'dns-udp-responses-sent-ipv6': 'IPv6-UDP', 'dns-tcp-responses-sent-ipv6': 'IPv6-TCP'
    };
    var title_str = 'Responses';
    options.yAxis.title.text = title_str + y_suffix_text;
  }

  $.ajax({
    url: "/api/v1/traffic-volume",
    type: "GET",
    dataType: "json",
    data: req_data,
    success: function(res){
      options.plotOptions.area.pointStart = Date.UTC('2017', '00', '02'); // Jan is zero'th month in JS
      var queries_series = {};
      var chart_series = {};

      $.each(res, function(rsi, dates) {
        queries_series[rsi] = {};
        chart_series[rsi] = [];

        $.each(protocols, function(key, value){
          queries_series[rsi][key] = {};
          queries_series[rsi][key].name = value;
          queries_series[rsi][key].data = [];
        });

        $.each(dates, function(date, protos) {
          if(protos == null || protos == 0){
            $.each(protocols, function(key, value) {
              queries_series[rsi][key].data.push(null);
            });
          }else{
            $.each(protos, function(prot, value){
              if(prot in protocols){
                queries_series[rsi][prot].data.push(Math.round(value / denominator));
              }
            });
          }
        });
        $.each(queries_series[rsi], function(proto, series_data) {
          chart_series[rsi].push(series_data);
        });
      });

      $.each(chart_series, function(rsi, protos){
        if(time_interval == 'day'){
          options.title.text =  rsi + '.root-servers.net ' + title_str + suffix_text;
        }else{
          options.title.text =  rsi + '.root-servers.net ' + title_str + suffix_text;
        }

        options.chart.renderTo = 'container_' + rsi;
        options.exporting.filename = options.title.text;
        options.series = protos;
        new Highcharts.Chart(options);
      });
    }
  });
}
