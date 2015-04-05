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
        this.redirect('/rsvp/' + this.request.query.rsvpId);
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
        this.success = this.request.query.success;
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
                isAttending: this.party.attending === 'yes',
                isNotAttending: this.party.attending === 'no',
                isMaybeAttending: this.party.attending === 'maybe',
                email: this.party.email,
                specialRequests: this.party.requests,
                partyMembers: this.party.partyMembers,
                success: this.success
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
        var rsvped = false;
        var partyMembers = body.partyAttendees;
        if (typeof(partyMembers) !== 'undefined') {
            party.partyMembers.forEach(function (e, i, a) {
                e.attending = partyMembers.indexOf(e.name) != -1;
            });
        } else {
            party.partyMembers.forEach(function (e, i, a) {
                e.attending = false;
            });
        }
        if (body.attending) { rsvped = true }
        party.email = body.email;
        party.attending = body.attending;
        party.rsvped = rsvped;
        party.requests = body.specialRequests;
        parties.updateById(party._id, party);
        //this.success = true;
        yield next;
    },
    function* (next) {
        this.redirect('/rsvp/' + this.params.id + '?success=true');
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