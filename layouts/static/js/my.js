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

$(function()
{
    $(document).on('click', '.btn-add', function(e)
    {
        e.preventDefault();

        var controlDiv = $('div[class="guestDiv col-sm-8"]:first'),
            currentEntry = $(this).parents('.entry:first'),
            newEntry = $(currentEntry.clone()).appendTo(controlDiv);

        newEntry.find('input').val('');
        controlDiv.find('.entry:not(:last) .btn-add')
            .removeClass('btn-add').addClass('btn-remove')
            .removeClass('btn-success').addClass('btn-danger')
            .html('<span class="glyphicon glyphicon-minus"></span>');
    }).on('click', '.btn-remove', function(e)
    {
        $(this).parents('.entry:first').remove();

        e.preventDefault();
        return false;
    });
});
