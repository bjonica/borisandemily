var Koa = require("koa");
var handlebars = require("koa-handlebars");
var router = require("koa-router")();
var koaStatic = require("koa-static");
var monk = require('monk');
var wrap = require('co-monk');
var db = monk('localhost/test');
var bodyParser = require('koa-bodyparser');
var app = Koa();

var parties = wrap(db.get('parties'));

//parties.insert({
//    rsvpId: 1,
//    rsvped: false,
//    attending: null,
//    email: null,
//    requests: null,
//    additionalAllowed: 0,
//    additionalAttending: 0,
//    partyMembers: [
//        {
//            name: "Test plus one",
//            attending: true
//        }
//    ]
//});

app.use(handlebars({
    defaultLayout: "main",
    cache: true
}));

app.use(bodyParser());

app.use(function* (next) {
    if (this.status == 404) {
        yield this.render("404", {
            title: "Boris & Emily",
            subTitle: "May 31, 2015"
        });
    }
    yield next;
});

router.get('/rsvp', function* (next) {
    if (this.request.query && this.request.query.rsvpId) {
        this.redirect('rsvp/' + this.request.query.rsvpId);
    } else {
        yield this.render("rsvp", {
            coverHeading: "RSVP",
            title: "Boris & Emily",
            subTitle: "May 31, 2015"
        });
    }
    yield next;
});

router.get('/rsvp/:id',
    function* (next) {
        this.party = yield parties.findOne({ rsvpId: parseInt(this.params.id) });
        yield next;
    },
    function* (next) {
        if (this.party == null) {
            yield this.render("rsvp", {
                coverHeading: "RSVP",
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                notFound: true
            })
        } else {
            yield this.render("rsvp", {
                coverHeading: "RSVP",
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                found: true,
                rsvped: this.party.rsvped,
                rsvpId: this.party.rsvpId,
                attending: this.party.attending,
                email: this.party.email,
                requests: this.party.requests,
                partyMembers: this.party.partyMembers
            })
        }
        console.log(this.party);
        yield next;
    }
);

router.post('/rsvp/:id',
    function* (next) {
        var body = this.request.body;
        var party = yield parties.findOne({ rsvpId: parseInt(this.params.id) });
        var isAttending = body.attending === 'yes';
        var rsvped = false;
        var partyMembers = body.partyAttendees;
        party.partyMembers.forEach(function (e, i, a) {
            e.attending = !(typeof(partyMembers.find(p => p === e.name)) === 'undefined');
        });
        if (body.attending) { rsvped = true }
        db.update({rsvpId: id}, {
            email: this.request.body.email,
            attending: isAttending,
            rsvped: rsvped,
            requests: body.specialRequests,
            partyMembers: party.partyMembers
        });
        //parties.insert({
//    rsvpId: 1,
//    rsvped: false,
//    attending: null,
//    email: null,
//    requests: null,
//    additionalAllowed: 0,
//    additionalAttending: 0,
//    partyMembers: [
//        {
//            name: "Test plus one",
//            attending: true
//        }
//    ]
//});
        yield next;
    }
);

app.use(koaStatic(__dirname + '/bower_components/bootstrap/dist'));
app.use(koaStatic(__dirname + '/bower_components/jquery/dist'));
app.use(koaStatic(__dirname + '/layouts/css'));
app.use(koaStatic(__dirname + '/layouts/img'));
app.use(koaStatic(__dirname + '/layouts/static'));

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);