// var start_pos = 0;
// var head_pos = 0;
// var buffer = 30;
// console.log(document.title);
// if (document.title == "Yu's Site") {
//   head_pos = 3;
// } else {
//   head_pos = -1;
// }
// $(window).scroll(function(e){
//   var current_pos = $(this).scrollTop();
//   if (current_pos > head_pos) {
//     if (current_pos > start_pos+buffer) {
//       // console.log('down');
//       $('#up').text('scroll direction: down');
//       $('.main-nav').fadeOut();
//     } else if (current_pos < start_pos-buffer) {
//       // console.log('up');
//       $('#up').text('scroll direction: up');
//       $('.main-nav').fadeIn();
//     }
//   }
//   else {
//     $('#up').text('scroll direction: 0');
//     $('.main-nav').fadeOut();
//   }
//
//   $('#out').text('scrollTop: '+$(this).scrollTop());
//   start_pos = current_pos;
// });
