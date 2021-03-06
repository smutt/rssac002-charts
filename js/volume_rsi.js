/* Copyright Andrew McConachie <andrew@depht.com> 2021 */

$(document).ready(function() {
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
        formatter: function () {
          return this.value / 1000000000;
        }
      }
    },
    plotOptions: {
      area: {
        pointInterval: 86400000, // 1 day in ms
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

  if(direction == 'received'){
    var protocols = {
        'dns-udp-queries-received-ipv4': 'IPv4-UDP', 'dns-tcp-queries-received-ipv4': 'IPv4-TCP',
        'dns-udp-queries-received-ipv6': 'IPv6-UDP', 'dns-tcp-queries-received-ipv6': 'IPv6-TCP'
    };
    var title_str = 'Queries';
    options.yAxis.title.text = title_str;
  }else{
    var protocols = {
        'dns-udp-responses-sent-ipv4': 'IPv4-UDP', 'dns-tcp-responses-sent-ipv4': 'IPv4-TCP',
        'dns-udp-responses-sent-ipv6': 'IPv6-UDP', 'dns-tcp-responses-sent-ipv6': 'IPv6-TCP'
    };
    var title_str = 'Responses';
    options.yAxis.title.text = title_str;
  }

  $.ajax({
    url: "http://rssac002.depht.com/api/v1/traffic-volume",
    type: "GET",
    dataType: "json",
    data: {
      rsi: 'a-m',
      start_date: '2017-01-01',
      end_date: end_date,
    },
    success: function(res){
      options.plotOptions.area.pointStart = Date.UTC('2017', '00', '01'); // Jan is zero'th month in JS
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
          if(protos == null) {
            $.each(protocols, function(key, value) {
              queries_series[rsi][key].data.push(null);
            });
          }else{
            $.each(protos, function(prot, value){
              if(prot in protocols){
                queries_series[rsi][prot].data.push(value);
              }
            });
          }
        });
        $.each(queries_series[rsi], function(proto, series_data) {
          chart_series[rsi].push(series_data);
        });
      });

      $.each(chart_series, function(rsi, protos){
        options.chart.renderTo = 'container_' + rsi;
        options.title.text =  rsi + '.root-servers.net ' + title_str + ' per-day (billion)';
        options.exporting.filename = options.title.text;
        options.series = protos;
        new Highcharts.Chart(options);
      });
    }});
});
