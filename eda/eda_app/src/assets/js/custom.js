function init_plugins() {
    $(function() {
        "use strict";

        // ============================================================== 
        // Auto select left navbar
        // ============================================================== 
        $(function() {
            var url = window.location;
            var element = $('ul#sidebarnav a').filter(function() {
                return this.href == url;
            }).addClass('active').parent().addClass('active');
            while (true) {
                if (element.is('li')) {
                    element = element.parent().addClass('in').parent().addClass('active');
                } else {
                    break;
                }
            }

        });

        // ============================================================== 
        // Sidebarmenu
        // ============================================================== 
        $(function() {
            $('#sidebarnav').EdaMenu();
        });

        // ============================================================== 
        // Perfact scrollbar
        // ============================================================== 
        $('.scroll-sidebar, .right-side-panel, .message-center, .right-sidebar').perfectScrollbar();

        $(".list-task li label").click(function() {
            $(this).toggleClass("task-done");
        });

    });

}
