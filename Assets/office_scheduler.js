var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
var total_waitlist = 0;
// Office Hour Scheduler render content to hbs file
function renderOfficeHourSchedulerContent (res, sub_heading) {
  var event_type  = $('.office-schedule-switch-btn a.active').data('name');
  var template    = getHandlebarsTemplate('office_scheduler/show');
  var container   = $('.schedule_builder_index');

  container.html( template({ dataArr: res, sub_heading: sub_heading,
                             event_type: event_type.toLowerCase(),
                             first_page: true
                          }));
}

// render Office Hour Scheduler's appointment
function renderAppointmentContent (res) {
  var template    = getHandlebarsTemplate('office_scheduler/appointment');
  var dataArr     = res.slots || [];
  var data_keys   = Object.keys(dataArr);
  var container   = $('#appointment-listing');
  $.each(data_keys, function (key, val) {
    if ( container.find("."+val).length == 0 ) {
      date = new Date(val);
      full_date = monthNames[date.getMonth()]+" "+date.getDate()+", "+date.getFullYear();
      html_str = "<div class='"+val+"'><h3 class='event-date'>"+full_date+"</h3></div>";
      container.append(html_str);
    }
    var target_container = container.find("."+val);
    target_container.append( template( { dataArr: dataArr[val] }) )
  });
}

// Office Hour Scheduler render detail content to hbs file
function renderOfficeHourSchedulerDetailContent(res, calender){
  if (calender) {
    var date_template = getHandlebarsTemplate('office_scheduler/calender');
    $('.date-info').html(date_template({
      dataArr: getCalenderData(res),
      start_month: getStartMonth(res)
    }));
  }
  var template    = getHandlebarsTemplate('office_scheduler/detail');
  var container   = $('.office_scheduler_detail');
  var event_date  = $('.office-schedule-date .set .active').data('date');
  if(res['mentors'].length > 0){
    container.html(template({
      dataArr: res['mentors'],
      event_id: res['id'],
      event_date: event_date
    }));
  }else{
    if($('.office-calender-date').hasClass('active')){
      today_day = new Date().getDate();
      event_day = new Date(event_date).getDate();
      var msg;
      if(today_day == event_day){
        msg = "No lineup is happening currently."
      }else{
       msg = "No lineup is scheduled yet."
      }
      container.html("<span class='no-event-data'>"+msg+"</span>");
    }
  }
}

// Office Scheduler Mentor content
function renderOfficeHourSchedulerMentorContent(res, mentor_obj, event_date, args){
  var template    = getHandlebarsTemplate('office_scheduler/slots');
  var container   = $('.slots-container');
  container.removeClass('hide');
  container.html(template({
    mentor: mentor_obj,
    dataArr: res,
    date: event_date
  }));
  // show_bio_more_less();
  openBookingPopup(args);
}

// Builder image
function builderImgUrl(img_url){
  return "url(" + img_url +")";
}

function displayEventDate(date){
  var date  = new Date(date);
  var month = monthNames[date.getMonth()];
  return month + " " + ("0" + date.getDate()).slice(-2) + ", " + date.getFullYear();
}

//  Format Builder date
function officeBuilderDate(start_date, end_date){
  var start   = new Date(start_date);
  var end     = new Date(end_date);
  start_month = monthNames[start.getMonth()];
  end_month   = monthNames[end.getMonth()];

  if(start_month == end_month){
    var start_day = start.getDate();
    var end_day = end.getDate();
    if (start_day == end_day) {
      return (start_month + " " + ("0" + start_day).slice(-2) + ", " +
              end.getFullYear())
    }else{
      return (start_month + " " + ("0" + start_day).slice(-2) + "-" +
              ("0" + end_day).slice(-2) +", " + end.getFullYear())
    }
  }else{
    return (start_month + " " + ("0" + start.getDate()).slice(-2) + "-" +
              end_month + " "+ ("0" + end.getDate()).slice(-2) +", " +
              end.getFullYear())
  }
}

// Display mentors based on calender date
function eventDetailMentorData(evt) {
  var self = evt;
  var url = window.location.href;
  var data = {
    "date": self.attr('data-date')
  }

  var onBeforeSend = function () {
    events('remove');
    loader('show');
  }

  var onDone = function ( res ) {
    renderOfficeHourSchedulerDetailContent(res);
    // replacing url for dates
    replaceUrl = updateQueryStringParameter(url, 'date', self.attr('data-date'));
    pushOrReplaceState('replace', replaceUrl, {});
  }

  var onFail = function( err ) {
    console.log( "Error --> ", err );
    events('add');
    loader('hide');
  }

  var onAlways = function() {
    events('add');
    loader('hide');
  }

  ajaxCall('GET', url, data, onBeforeSend, onDone, onFail, onAlways, { dataType: 'json' });
}

// get upcoming event data
$(document).on('click', '.office-schedule-switch-btn a', function(){
  var self = $(this);
  var name = self.data('name');
  var data = {}
  var url  = '/office_schedulers?event_type='+name.toLowerCase();
  $('.office-schedule-switch-btn a').removeClass('active');
  self.addClass('active');
  var onBeforeSend = function () {
    events('remove');
    loader('show');
  }

  var onDone = function ( res ) {
    renderOfficeHourSchedulerContent(res['results'], name+' Events');
  }

  var onFail = function( err ) {
    console.log( "Error --> ", err );
  }

  var onAlways = function() {
    events('add');
    loader('hide');
  }
  ajaxCall('GET', url, data, onBeforeSend, onDone, onFail, onAlways, {dataType: 'json'});
});

// get upcoming event data
$(document).on('click', '.office-calender-date', function(){
  if(!$(this).hasClass('active')){
    $('.office-calender-date').removeClass('active');
    eventDetailMentorData($(this));
    $(this).addClass('active')
  }
});

$(document).on("click", ".office-schedule-book, .office-schedule-join-waitlist", function(){
  if ( !isLoggedInUser() ) {
    showLoginPopup();
    return;
  }
  var self = $(this);
  var event_id = self.data("event-id");
  var slot_id = self.data("slot-id");
  var start_time = self.data("slot-start-time");
  var end_time = self.data("slot-end-time");
  var mentor_id = self.data("slot-mentor-id");
  var mentor_name = $(".event-user-name").html();
  var time_slot = self.closest(".list").find(".time-slot").data("time-slot");
  var template   = getHandlebarsTemplate('book_appointment');
  var url        = window.location.href;
  var replaceUrl = updateQueryStringParameter(url, 'slot_id', slot_id);
  if ( !event_id )
    return;
  if (self.hasClass("office-schedule-book")) {
    var data = {event_id: event_id, slot_id: slot_id, booking: true, url: "/appointments",
     mentor_name: mentor_name, time_slot: time_slot, start_time: start_time, end_time: end_time,
     mentor_id: mentor_id}
    replaceUrl = updateQueryStringParameter(replaceUrl, 'type', 'office-schedule-book');
  }else{
    var waitlist = self.data("waitlist");
    var data = {event_id: event_id, slot_id: slot_id, booking: false, waitlist: waitlist,
     url: "/appointments/join_waitlist", mentor_name: mentor_name, time_slot: time_slot,
     start_time: start_time, end_time: end_time, mentor_id: mentor_id }
    replaceUrl = updateQueryStringParameter(replaceUrl, 'type', 'office-schedule-book');
  }
  addContentToNewModalPopupAndShow( template( data ));
  pushOrReplaceState('replace', replaceUrl, {});
});

$(document).on("click", ".locked-slot-item", function(){
  if ( !isLoggedInUser() ) {
    showLoginPopup();
    return;
  }
  var self = $(this);
  var package_label = self.closest(".event-btn-area").data("locked-package-label");
  var tamm_only = self.closest(".event-btn-area").data("tamm-only");
  var template  = getHandlebarsTemplate('slot_lock_popup');
  var data = { msg: package_label, cancel_button_text: "No", tamm_only: tamm_only,
               confirm_button_text: "Yes", url: "/packages" }
  addContentToNewModalPopupAndShow( template( data ));
});

$(document).on("click", "#appointment-submit", function(e){
  e.preventDefault();
  var self = $(this);
  var form_obj = self.closest("form");
  var url = form_obj.attr('action');
  var data = getFormData(form_obj.serializeArray());
  var onBeforeSend = function() {
    events('remove');
    loader('show');
  }
  var onDone = function ( res ) {
    if (res.status) {
      var template  = getHandlebarsTemplate('confirm_popup');
      var msg = res.message+" with "+res.params.mentor_name+" for "+res.params.time_slot;
      var confirm_label_text = res.action_name == "create" ? "Your slot is confirmed" : "You are in waitlist";
      var slot_id = res.params.scheduler_slot_id;
      var data = {msg: msg, cancel_button_text: "Cancel Appointment", confirm_button_text: "Ok",
        confirm: true, confirm_text: "Are you sure, you want to cancel the booking?", delete_method: true,
        url: "/appointments/"+res["id"], remote: true, confirm_label_text: confirm_label_text, slot_id: slot_id}
      addContentToNewModalPopupAndShow( template( data ));
    }else{
      $(".error").html("");
      if (res.errors) {
        if (res.errors.name)
          $(".error.name").html(res.errors.name.join(", "))
        if (res.errors.email)
          $(".error.email").html(res.errors.email.join(", "))
        if (res.errors.phone_number)
          $(".error.phone_number").html(res.errors.phone_number.join(", "))
        if (!res.errors.name && !res.errors.email && !res.errors.phone_number){
          if (res.errors.scheduler_slot_id)
            $(".error.general-error").html(res.errors.scheduler_slot_id)
          else if (res.errors.base)
            $(".error.general-error").html(res.errors.base)
        }
      }

      $(".error-msg-box").html(res["errors"])
    }
  }
  var onFail = function( err ) {
    events('add');
    btnLoader('hide', self);
  }
  var onAlways = function() {
    events('add');
    loader('hide');
  }
  ajaxCall('POST', url, data, onBeforeSend, onDone, onFail, onAlways, {dataType: 'json'});
});

$(document).on("click", ".on-confirm-slot-booking", function(){
  var slot_id = $(this).data("slot-id");
  var confirm_label_text = $(this).data("confirm-label-text");
  var target_slot = $(".event-btn-area.slot-item-"+slot_id);
  $("<div class='confirm-text'>"+confirm_label_text+"</div>").insertBefore(target_slot);
  target_slot.find(".office-schedule-book, .office-schedule-join-waitlist").remove();
});

$(document).on("click", ".show-waitlist-btn", function(){
  if ( !isLoggedInUser() ) {
    showLoginPopup();
    return;
  }
  var slot_id = $(this).data("slot-id");
  total_waitlist = $(this).data("slot-waitlist");
  var url = "/appointments/waitlist";
  var data = { id: slot_id }
  var onBeforeSend = function () {
    events('remove');
    loader('show');
  }

  var onDone = function ( res ) {
    var template   = getHandlebarsTemplate('waitlist_popup');
    var remaining_waitlist = (total_waitlist - (res.length - 1))
    addContentToNewModalPopupAndShow( template( { data: res, remaining_waitlist: remaining_waitlist } ) );
  }

  var onFail = function( err ) {
    console.log( "Error --> ", err );
    events('add');
    loader('hide');
  }

  var onAlways = function() {
    events('add');
    loader('hide');
  }
  ajaxCall('GET', url, data, onBeforeSend, onDone, onFail, onAlways, {dataType: 'json'});
});

//utility function for get form data
function getFormData(data) {
  var unindexed_array = data;
  var indexed_array = {};

  $.map(unindexed_array, function(n, i) {
  indexed_array[n['name']] = n['value'];
  });

  return indexed_array;
}

// List scheduler slots
$(document).on('click', '.scheduler-slots', function(){
  var self       = $(this);
  var event_id   = self.data('event-id');
  var event_date = self.data('event-date');
  var mentor_obj  = getSchedulerMentorObject(self);
  var url        = '/office_schedulers/'+event_id+'/slots'
  var data       = {
    mentor_id: mentor_obj.id,
    date: event_date
  }

  var onBeforeSend = function () {
    events('remove');
    loader('show');
  }

  var onDone = function ( res ) {
    $('.mentors-container').addClass('hide');
    $('.office_scheduler_detail').addClass('hide');
    renderOfficeHourSchedulerMentorContent(res, mentor_obj, event_date, {})
    // replacing slots url for mentor
    var event_type = getCurrentUrlParameter('event_type')
    replaceUrl = url+"?mentor_id="+mentor_obj.id+"&date="+event_date+ "&event_type="+ event_type
    pushOrReplaceState('replace', replaceUrl, {});
    tooltip_close();
  }

  var onFail = function( err ) {
    console.log( "Error --> ", err );
    events('add');
    loader('hide');
  }

  var onAlways = function() {
    events('add');
    loader('hide');
  }
  ajaxCall('GET', url, data, onBeforeSend, onDone, onFail, onAlways, {dataType: 'json'});
});

// List scheduler slots
$(document).on('click', '.slot-back-btn', function(){
  var date       = getCurrentUrlParameter('date');
  var event_type = getCurrentUrlParameter('event_type');
  var url = window.location.href
  var the_arr = url.split('/');
  the_arr.pop();
  url = the_arr.join('/') + "?date=" +date + "&event_type=" + event_type

  if($('.mentors-container').length > 0){
    $('.mentors-container').removeClass('hide');
    $('.office_scheduler_detail').removeClass('hide');
    $('.slots-container').addClass('hide');
    pushOrReplaceState('replace', url, {});
  }else{
    window.location = url
  }
});

function displayTimeforSlot(time){
  return time.toLocaleTimeString(navigator.language, {
    hour: '2-digit',
    minute:'2-digit'
  })
}

// Load more office hour schedule events with pagination
function onLoadMoreOfficeSchedules( evt ){
  var self = $(this);
  var name = $('.office-schedule-switch-btn a.active').data('name');
  var url  = '/office_schedulers'
  var data = {
    page: $('#load_more').attr('data-next-page'),
    event_type: name.toLowerCase()
  }
  var onBeforeSend = function () {
    events('remove');
    btnLoader('show', self);
  }

  var onDone = function ( res ) {
    var next_page  = res["results"]["next_page"];
    var template   = getHandlebarsTemplate('office_scheduler/more_events');
    var container  = $('.office-schedule-list');
    $('#load_more').attr('data-next-page', next_page);
    container.append(template({ events: res["results"]["events"], event_type: name }));
    showHideLoadMoreSection($('#load_more'), next_page);
  }

  var onFail = function( err ) {
    console.log( "Error --> ", err );
    events('add');
    btnLoader('hide', self);
  }

  var onAlways = function() {
    events('add');
    btnLoader('hide', self);
  }
  ajaxCall('GET', url, data, onBeforeSend, onDone, onFail, onAlways, {dataType: 'json'});
}

// Display calender date according to timezone
function getCalenderData(res){
  var start   = new Date(res['start_date']);
  start.setHours(0,0,0,0);
  var end     = new Date(res['end_date']);
  var current = new Date();
  var arr = [];
  var date = new Date(getCurrentUrlParameter('date')).getDate() || current.getDate();
  for(var d=start; d<=end; d.setDate(d.getDate() + 1)){
    var data = {
      day: scheduleWeekdays()[d.getDay()],
      utc_date: d.toISOString(),
      date: ("0" + d.getDate()).slice(-2),
      prev_class: isBeforeDate(d, current),
      active_class: date == d.getDate()
    }
    arr.push(data);
  }
  return arr;
}

// Get start month based on current timezone
function getStartMonth(res){
  var start = new Date(res['start_date']);
  var end_date = new Date(res['end_date']);

  var start_month = monthNames[start.getMonth()];
  var end_month   = monthNames[end_date.getMonth()];
  var s_year = start.getFullYear();
  var e_year = end_date.getFullYear();

  if(start_month == end_month){
    return start_month + " " + s_year;
  }else{
    return start_month + " " + s_year + " - " + end_month + " " + e_year
  }
}

//check if previous date
function isBeforeDate(start, current){
  var past = new Date(start.toDateString());
  var current = new Date(current.toDateString());
  return past < current;
}

// Load more office hour schedule appointments with pagination
function onLoadMoreAppointments( evt ){
  var self = $(this);
  var name = $('.office-schedule-switch-btn a.active').data('name');
  var url  = $('.office-schedule-switch-btn').data('url');
  var data = {
    page: $('#load_more').attr('data-next-page'),
    type: name
  }
  var onBeforeSend = function () {
    events('remove');
    btnLoader('show', self);
  }

  var onDone = function ( res ) {
    var next_page  = res["results"]["next_page"];
    var template    = getHandlebarsTemplate('office_scheduler/appointment');
    var container   = $('#appointment-listing');
    var dataArr     = res["results"]["slots"] || [];
    var data_keys   = Object.keys(dataArr);
    $('#load_more').attr('data-next-page', next_page);
    $.each(data_keys, function (key, val) {
      if ( container.find("."+val).length == 0 ) {
        date = new Date(val);
        full_date = monthNames[date.getMonth()]+" "+date.getDate()+", "+date.getFullYear();
        html_str = "<div class='"+val+"'><h3 class='event-date'>"+full_date+"</h3></div>";
        container.append(html_str);
      }
      var target_container = container.find("."+val);
      target_container.append( template( { dataArr: dataArr[val] }) )
    });
    showHideLoadMoreSection($('#load_more'), next_page);
  }

  var onFail = function( err ) {
    console.log( "Error --> ", err );
    events('add');
    btnLoader('hide', self);
  }

  var onAlways = function() {
    events('add');
    btnLoader('hide', self);
  }
  ajaxCall('GET', url, data, onBeforeSend, onDone, onFail, onAlways, {dataType: 'json'});
}

function openBookingPopup(args){
  // Using set timeout becuase we need slots to load first
  setTimeout(function(){
    if(args["slot_id"] && args["type"]){
      $("a."+args['type']+"[data-slot-id='" + args['slot_id'] +"']").click();
    }
  }, 3000);
}

//  Removing params on booking slot
$('#myNewModal').on('hidden.bs.modal', function (e) {
  var url = window.location.href;
  url = removeURLParameter(url, 'slot_id');
  url = removeURLParameter(url, 'type');
  pushOrReplaceState('replace', url, {});
})

// removing params from url
function removeURLParameter(url, parameter) {
  //prefer to use l.search if you have a location/link object
  var urlparts= url.split('?');
  if (urlparts.length>=2) {
    var prefix= encodeURIComponent(parameter)+'=';
    var pars= urlparts[1].split(/[&;]/g);
    //reverse iteration as may be destructive
    for (var i= pars.length; i-- > 0;) {
      //idiom for string.startsWith
      if (pars[i].lastIndexOf(prefix, 0) !== -1) {
        pars.splice(i, 1);
      }
    }
    url= urlparts[0]+'?'+pars.join('&');
    return url;
  }else {
    return url;
  }
}

// Add show more / show less feature on mentor's bio
function show_bio_more_less(){
  $(".show-more-less").moreLines({
    linecount: 3,
    baseclass: 'show-more-less-',
    buttontxtmore: "<span class='span-show-more'>"+I18n.t("show_more")+"</span>",
    buttontxtless: "<span class='span-show-more'>"+I18n.t("show_less")+"</span>",
    animationspeed: 250
  });
}

$(document).on('click', '.sum-show-more', function(){
  $(".event-user-summery").toggleClass("h-auto");
  $(".sum-show-more .more, .sum-show-more .less").toggleClass("d-show");
});