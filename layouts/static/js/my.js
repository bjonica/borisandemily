$('input[type="radio"][id="attendanceYes"]').change(function() {
    console.log("running");
    if(this.checked) {
        $(function(){
            $("#partyAttendance").removeClass('hide');
        });
    } else {
        $(function(){
            $("#partyAttendance").addClass('hide');
        });
    }
});

$('input[type="radio"][id="attendanceNo"]').change(function() {
    console.log("runningNo");
    if(this.checked) {
        $(function(){
            $("#partyAttendance").addClass('hide');
        });
    }
});

$('input[type="radio"][id="attendanceMaybe"]').change(function() {
    console.log("runningMaybe");
    if(this.checked) {
        $(function(){
            $("#partyAttendance").addClass('hide');
        });
    }
});