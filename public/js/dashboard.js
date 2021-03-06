// CHART
Chart.defaults.global.defaultFontFamily = `-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
Chart.defaults.global.defaultFontColor = `#292b2c`;



function onload() {
  setSectionSelection();
  showProgessBar();

  if( ! localStorage.getItem(`settings`) ) {
    setUserSettings();
  } else {
    setDefaultSection();
  }

  setLastUpdated();
  setTableDailyAttendance();
  setChartAttendanceYear();
  setChartAttendanceMonth( new Date().getFullYear() );
  setChartAttendanceCourse();
  setChartAttendanceSection();
  setChartAttendanceGender();

  setFrmAttendanceFocus();
}



  // USER SETTINGS
  var setUserSettings = () => {
    let loggedUser = JSON.parse( localStorage.getItem(`loggedUser`) );

    var settings = {
      "async": true,
      "crossDomain": true,
      "url": `/users/${loggedUser.ID}/settings`,
      "method": "GET",
      "headers": {
        "Content-Type": "application/x-www-form-urlencoded",
        "cache-control": "no-cache",
        "Postman-Token": "9db2a196-bcc1-43ff-8261-a0bff5d91442"
      },
      "data": ""
    }
    
    $.ajax(settings)
      .done( (response) => {
        let settings = response.data;
        localStorage.setItem( `settings`, JSON.stringify(settings) );
        setDefaultSection();
      })
      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
            notify( responseObj.data, `danger` );
      } );
  };



  var setSectionSelection = () => {
    var selectEl = $(`select[name="section"]`);
    SECTIONS.forEach( ( section, i ) => {
      var optionEl = document.createElement(`option`);
        optionEl.value = (i + 1);
        optionEl.innerHTML = section;

      selectEl.append( optionEl );
    } );
  }



  // DEFAULT SECTION
  var setDefaultSection = () => {
    let settings = JSON.parse( localStorage.getItem(`settings`) );
    document.forms[`frmAttendance`][`section`].value = settings.section;    
  };



  // LAST-UPDATED
  var setLastUpdated = () => {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/attendance/last-updated",
      "method": "GET",
      "headers": {
        "cache-control": "no-cache",
        "Postman-Token": "b40974a1-bc96-414b-be1a-cd54b85b85e7"
      }
    }
    $.ajax(settings)      
      .done( (response) => {      
        $(`.last-updated`).text( new Date(response.data.lastUpdated).toDateString() );
      })
      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
            notify( responseObj.data, `danger` );
      } );
  };



  // ATTENDANCE PER DAY
  var setTableDailyAttendance = () => {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/attendance/daily",
      "method": "GET",
      "headers": {
        "cache-control": "no-cache",
        "Postman-Token": "7b907c2e-6757-4e39-8144-be5fd8e05216"
      }
    }
    
    $.ajax(settings)
      .done( (response) => {
        document.getElementById(`table-attendance-daily-date`).innerHTML = new Date().toDateString();
        const sectionLabels = SECTIONS;
        var dataTable = $(`#tblAttendanceDaily`).DataTable();    
            dataTable.clear().draw();
        
            $.each( response.data, ( i, attendance ) => {
                dataTable.row.add( {
                    0: attendance.barcode,
                    1: `${attendance.lastName}, ${attendance.firstName} ${attendance.middleName}`,
                    2: attendance.gender,
                    3: attendance.course,
                    4: attendance.timeIn,
                    5: attendance.timeOut,
                    6: sectionLabels[attendance.section-1]
                  } ).draw();
            } );
      } )

      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
            notify( responseObj.data, `danger` );
      } );
  };



  // TEXT SUMMARY
  var setTextReadingTimeSummary = ( attendance, data ) => {
    var totalEl = $(`div#text-attendance-${attendance} .text-summary .text-total`);
    var averageEl = $(`div#text-attendance-${attendance} .text-summary .text-average`);
    var attendanceEl = $(`div#text-attendance-${attendance} .text-summary .text-attendance`);
    var dataEl = $(`div#text-attendance-${attendance} .text-data`);

    var total = data.length,
        average = 0, sum = 0,
        dataStr = ``;

    data.forEach( ( value, index ) => {
      sum += value.totalAttendance;

      if( attendance == `month` )
        value[`${attendance}`] = new Date( new Date().setMonth( value.month-1 ) ).toDateString().split(" ")[1];
      else if( attendance == `section` )
        value[`${attendance}`] = SECTIONS[ value[`${attendance}`]-1 ];
      else if( attendance == `gender` )
        if( value[`${attendance}`] == `F` )
          value[`${attendance}`] = `Female`;
        else if( value[`${attendance}`] == `M` )
          value[`${attendance}`] = `Male`;

      if( index == 0 )
        dataStr += `A `;
      else
        dataStr += `a `;

      dataStr += `total of <b class="text-info">${value.totalAttendance}</b> has been recorded in patron attendance for <i class="text-warning">${value[`${attendance}`]}</i>`;

      if( (index+1) < total ) {
        dataStr += `; `;
        if( (index+1) == (total-1) )
          dataStr += `and `;
      }
      else
        dataStr += `. `;
    } );
    average = sum/total;

    totalEl.html( sum );
    averageEl.html( average.toFixed(2) );
    attendanceEl.html( attendance );
    dataEl.html( dataStr );
  };



  // ATTENDANCE PER YEAR
  var setChartAttendanceYear = () => {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/attendance/count-per-year",
      "method": "GET",
      "headers": {
        "cache-control": "no-cache",
        "Postman-Token": "f0f91413-9d15-4581-a775-37373e0ef557"
      }
    }
  
    $.ajax(settings)
      .done( (response) => {
        setTextReadingTimeSummary( `year`, response.data );

        var labels = [], data = [];
        $.each( response.data, (i) => {
          labels.push( response.data[i].year );
          data.push( response.data[i].totalAttendance );
        } );
        
        var ctx = document.getElementById( `chart-attendance-year` );
        var chartAttendanceYear = new Chart(ctx, {
          type: `line`,
          data: {
            labels: labels,
            datasets: [{
              label: `Count`,
              data: data,
              lineTension: 0.3,
              backgroundColor: `rgba(2,117,216,0.2)`,
              borderColor: `rgba(2,117,216,1)`,
              pointRadius: 5,
              pointBackgroundColor: `rgba(2,117,216,1)`,
              pointBorderColor: `rgba(255,255,255,0.8)`,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: `rgba(2,117,216,1)`,
              pointHitRadius: 50,
              pointBorderWidth: 2
            }]
          },
          options: {
            legend: {
              display: false
            }
          }
        });

        animateProgressBar( 20 );
      } )
      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
            notify( responseObj.data, `danger` );
      } );
  };



  // ATTENDANCE PER MONTH
  var setChartAttendanceMonth = ( year ) => {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/attendance/count-per-month?year=" + year,
      "method": "GET",
      "headers": {
        "cache-control": "no-cache",
        "Postman-Token": "f0f91413-9d15-4581-a775-37373e0ef557"
      }
    }
  
    $.ajax(settings)
      .done(function (response) {
        setTextReadingTimeSummary( `month`, response.data );

        var labels = [], data = [];
        $.each( response.data, (i) => {     
          labels.push( response.data[i].month );
          data.push( response.data[i].totalAttendance );
        } );        
        

        
        var ctx = resetCanvas( `chart-attendance-month` );
        var chartAttendanceMonth = new Chart(ctx, {
          type: `line`,
          data: {
            labels: labels,
            datasets: [{
              label: `Count`,
              data: data,
              lineTension: 0.3,
              backgroundColors: `rgba(2,117,216,0.2)`,
              borderColor: `rgba(2,117,216,1)`,
              pointRadius: 5,
              pointBackgroundColor: `rgba(2,117,216,1)`,
              pointBorderColor: `rgba(255,255,255,0.8)`,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: `rgba(2,117,216,1)`,
              pointHitRadius: 50,
              pointBorderWidth: 2
            }]
          },
          options: {
            legend: {
              display: false
            }
          }
        });

        $(`h3.title > span.chart-attendance-month-year`).text( year );      

        animateProgressBar( 40 );
      })
      
      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
            notify( responseObj.data, `danger` );
      } );
  };



  // ATTENDANCE PER COURSE
  var setChartAttendanceCourse = () => {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/attendance/count-per-course",
      "method": "GET",
      "headers": {
        "cache-control": "no-cache",
        "Postman-Token": "29287d26-94c2-4d28-ba8b-eb6603e54069"
      }
    }
  
    $.ajax(settings)
      .done( (response) => {
        setTextReadingTimeSummary( `course`, response.data );

        var labels = [], data = [];
        $.each( response.data, (i) => {
          labels.push( response.data[i].course );
          data.push( response.data[i].totalAttendance );
        } );
    
        var ctx = document.getElementById(`chart-attendance-course`);
        var chartAttendanceCourse = new Chart(ctx, {
          type: `radar`,
          data: {
            labels: labels,
            datasets: [{
              label: `Count`,
              data: data,
              backgroundColor: `#69D2E7`
            }],
          },
          options: {
            legend: {
              display: false
            }
          }
        });
      

        animateProgressBar( 60 );
      } )
        
      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
            notify( responseObj.data, `danger` );
      } );
  };



  // ATTENDANCE PER LIBRARY SECTION
  var setChartAttendanceSection = () => {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/attendance/count-per-section",
      "method": "GET",
      "headers": {
        "cache-control": "no-cache",
        "Postman-Token": "9814f9e9-4d7f-4724-b482-475313c11539"
      }
    }
  
    $.ajax(settings)
      .done( (response) => {
        setTextReadingTimeSummary( `section`, response.data );

        var labels = SECTIONS, data = [],
            backgroundColors = [`#6B5B95`, `#DD4132`, `#9E1030`, `#FE840E`, `#C62168`, `#E94B3C`];
        $.each( response.data, (i) => {
          data.push( response.data[i].totalAttendance );
        } );
        
        var ctx = document.getElementById(`chart-attendance-section`);
        var chartAttendanceSection = new Chart(ctx, {
          type: `doughnut`,
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: backgroundColors
            }]
          }
        });
      
        animateProgressBar( 80 );

      } )
      
      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
            notify( responseObj.data, `danger` );
      } );
  };



  // ATTENDANCE PER GENDER
  var setChartAttendanceGender = () => {
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "/attendance/count-per-gender",
      "method": "GET",
      "headers": {
        "cache-control": "no-cache",
        "Postman-Token": "fd29db74-938f-4391-8a9e-4130af653758"
      }
    }
  
    $.ajax(settings)
    
      .done( (response) => {
        setTextReadingTimeSummary( `gender`, response.data );

        var labels = [`Female`, `Male`], data = [], backgroundColors = [`rgb(214,71,153)`, `rgb(0,0,255)`];
        $.each( response.data, (i) => {
          data.push( response.data[i].totalAttendance ); 
        } );
    
        var ctx = document.getElementById(`chart-attendance-gender`);
        var chartAttendanceGender = new Chart(ctx, {
          type: `pie`,
          data: {
            labels: labels,
            datasets: [ {
              data: data,
              backgroundColor: backgroundColors
            } ]
          }
        });

        animateProgressBar( 100 );
        setTimeout( () => {
          hideProgressBar();
        }, 1000 );
      } )

      .fail( (response) => {
        let responseObj = response.responseJSON;
        if( responseObj.error )
          notify( responseObj.data, `danger` );
      } );

  };


  
  var setFrmAttendanceFocus = () => {
    $(`form[name=frmAttendance] input[name=barcode]`).focus();
  };



// MY FUNCTIONS
var resetCanvas = ( canvasID ) => {
  var canvasContainer = $(`canvas#${canvasID}`).parent(),
      width = $(`canvas#${canvasID}`).width(),
      height = $(`canvas#${canvasID}`).height();
  $(`canvas#${canvasID}`).remove();
    canvasContainer.append(`<canvas id="${canvasID}"></canvas>`);

  var canvas = document.querySelector(`canvas#${canvasID}`);
  var ctx = canvas.getContext(`2d`);
    ctx.canvas.width = width;
    ctx.canvas.height = height;

  return ctx;
};



// EVENT LISTENERS
$(window).on( `keyup`, (e) => {
  // setFrmAttendanceFocus();
} );
$(`select#chart-attendance-month-year`).on( `change`, (e) => {
  setChartAttendanceMonth( Number(e.currentTarget.value) );
} );

$(`form[name=frmAttendance] input[name=barcode]`).on( `keyup`, (e) => {
  e.preventDefault();

  var inputValue = e.currentTarget.value,
      inputValueLength = inputValue.length,
      keyCode = e.keyCode;
    var frmAttendance = document.forms[`frmAttendance`];

  if( inputValue.length === 0 || e.altKey || e.ctrlKey )
    return false;
  if( keyCode == 13 ) {
    notify( `Patron with barcode of '${inputValue}' is not valid`, `warning` );
    return false;
  }

  // CHECK IF BARCODE IS VALID
  var settings = {
    "async": true,
    "crossDomain": true,
    "url": "/patrons/" + inputValue,
    "method": "GET",
    "headers": {
      "cache-control": "no-cache",
      "Postman-Token": "d91e34f3-127d-484d-803d-17b9c223ad1b"
    }
  }
  
  $.ajax(settings)
    .done( (response) => {
      if( response.error ) {
        frmAttendance[`isValid`].value = false;
        notify( response.data, `danger` );
      } else if( response.warning ) {
        frmAttendance[`isValid`].value = false;
        notify( response.message, `warning` );
      } else {
        if( response.count == 1 ) {
          frmAttendance[`isValid`].value = true;
          submitFrmAttendance();
        }
      }
    } )
    
    .fail( (response) => {
      let responseObj = response.responseJSON;
      if( responseObj.error ) {
        frmAttendance[`isValid`].value = false;
        notify( responseObj.data, `danger` );
      }
    } );

} );

var submitFrmAttendance = () => {
  var form = document.forms[`frmAttendance`],
      barcode = ( form[`barcode`].value ).trim(),
      section = form[`section`].value,
      isValid = form[`isValid`].value;

  form[`barcode`].value = null;
  
  if( barcode.length == 0 ) {
    return;
  }
  if( isValid != `true` ) {
    return false;
  }

  var settings = {
    "async": true,
    "crossDomain": true,
    "url": "/attendance/",
    "method": "POST",
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "cache-control": "no-cache",
      "Postman-Token": "53e2813f-c50e-4f67-a77d-080b7dc8375f"
    },
    "data": {
      "barcode": barcode,
      "section": section
    }
  }
  
  $.ajax(settings)
    .done( (response) => {
      if( response.error || response.warning ) {
        notify( response.message, `danger` );
        return false;
      }

      notify( response.message, `success` );
      form[`isValid`].value = false;
      form[`barcode`].value = null;

      setLastUpdated();
      setTableDailyAttendance();
      setChartAttendanceYear();
      setChartAttendanceMonth( new Date().getFullYear() );
      setChartAttendanceCourse();
      setChartAttendanceSection();
      setChartAttendanceGender();
      setFrmAttendanceFocus();
    } )
    
    .fail( (response) => {
      let responseObj = response.responseJSON;
      if( responseObj.error ) {
        frmAttendance[`isValid`].value = false;
        notify( responseObj.data, `danger` );
      }
    } );

};



// MY FUNCTIONS
var notify = ( message, type ) => {
  var icon = `pe-7s-` + ((type==`success`) ? `smile`:`close-circle`);

  var showMsg = ( message ) => {
      $.notify( {
          icon: icon,
          message: message
      }, {
          type: type,
          timer: 1000
      } );
  }

  if( typeof message == `object` ) {
      (message).forEach( error => {
          showMsg( error.msg );
      });
  } else {
      showMsg( message );
  }
};

var showProgessBar = () => {
  var content = $(`div.main-panel > div.content`);
    content.hide();

  var progressBarContainer = $(`div#progress-bar-container`);
    progressBarContainer.show();
};

var hideProgressBar = () => {
  var content = $(`div.main-panel > div.content`);
    content.show();

  var progressBarContainer = $(`div#progress-bar-container`);
    progressBarContainer.hide();
};

var animateProgressBar = ( value ) => {        
  var progressBar = document.querySelector(`div#progress-bar-container div.progress-bar`);
  var start = $(progressBar).attr( `aria-valuenow` );
  
  var x = start;
  var id = setInterval(frame, 50);
  function frame() {
      if( x < 33 ) {
        $(progressBar).addClass(`progress-bar-danger`);
      } else if( x < 66 ) {
        $(progressBar).removeClass(`progress-bar-danger`);
        $(progressBar).addClass(`progress-bar-warning`);
      } else {
        $(progressBar).removeClass(`progress-bar-warning`);
        $(progressBar).addClass(`progress-bar-success`);
      }



      if (x >= value) {
          clearInterval(id);
      } else {
          x++; 
          progressBar.setAttribute( `aria-valuenow`, x );
          progressBar.style.width = x + `%`; 
          progressBar.innerHTML = x * 1 + `%`;
      }
  }
};

onload();



//Printing
var formatPrintableTextSummary = (textSummary) => {
  var formattedText = textSummary.replace( /<[^>]*>?/g, `` );
  return formattedText;
};

$(`#print-chart-attendance-year`).click( () => {
    var dataUrl = document.getElementById(`chart-attendance-year`).toDataURL();
    var title = `Annual Patron Attendance`;
    var textSummary = formatPrintableTextSummary( document.getElementById(`text-attendance-year`).innerHTML );
    
    print(dataUrl, title, textSummary);
});

$(`#print-chart-attendance-month`).click( () => {
    var dataUrl = document.getElementById(`chart-attendance-month`).toDataURL();
    var year = document.querySelector(`.chart-attendance-month-year`).textContent;
    var title = `Monthly Patron Attendance for ${year}`;
    var textSummary = formatPrintableTextSummary( document.getElementById(`text-attendance-month`).innerHTML );
    
    print(dataUrl, title, textSummary);
});

$(`#print-chart-attendance-course`).click( () => {
    var dataUrl = document.getElementById(`chart-attendance-course`).toDataURL();
    var title = `Patron Attendance per Course`;
    var textSummary = formatPrintableTextSummary( document.getElementById(`text-attendance-course`).innerHTML );
    
    print(dataUrl, title, textSummary);
});

$(`#print-chart-attendance-section`).click( () => {
    var dataUrl = document.getElementById(`chart-attendance-section`).toDataURL();
    var title = `Patron Attendance per Library Section`;
    var textSummary = formatPrintableTextSummary( document.getElementById(`text-attendance-section`).innerHTML );
    
    print(dataUrl, title, textSummary);
});

$(`#print-chart-attendance-gender`).click( () => {
    var dataUrl = document.getElementById(`chart-attendance-gender`).toDataURL();
    var title = `Patron Attendance per Gender`;
    var textSummary = formatPrintableTextSummary( document.getElementById(`text-attendance-gender`).innerHTML );
    
    print(dataUrl, title, textSummary);
});

const print = (dataUrl, title, textSummary) => {
    var windowContent = ``;
      windowContent += `<html>`;
      windowContent += `<head><style>*{display:none;}@media print{*{display:block;}style{display:none;}}</style></head>`;
      windowContent += `<body>`;
      windowContent += `<h1 style="font-size:35px;">BESMART</h1>`;
      windowContent += `<img src="${dataUrl}" width="75%" height="100%" style="margin-left:75px">`;
      windowContent += `<h1>${title}</h1>`;
      windowContent += `<div>${textSummary}</div`;
      windowContent += `</body>`;
      windowContent += `</html>`;
    var printWin = window.open(`width=1366,height=692`);
    printWin.document.write(windowContent);
    printWin.focus();
    printWin.print();
    printWin.close();
}



const toggleTextSummary = (button, attendance) => {
  var buttonEl = $(button);
  var textEl = $(`#text-attendance-${attendance}`);
  
  textEl.toggle(`medium`);

  if( buttonEl.html() == `Show Summary` )
    buttonEl.html(`Hide Summary`);
  else if( buttonEl.html() == `Hide Summary` )
    buttonEl.html(`Show Summary`);
};