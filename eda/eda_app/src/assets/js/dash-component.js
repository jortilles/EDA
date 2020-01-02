function dashboard_component() {
    console.log('Dashboard Pluging runing');

    var set = function() {
        $("body").addClass("mini-sidebar");
        $('.navbar-brand span').hide();
        $(".sidebartoggler i").addClass("ti-menu");
    }

    $(window).ready(set);

}