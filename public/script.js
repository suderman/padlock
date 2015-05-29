// Toggle shift classname when holding shift key
$(document).keydown(function (e){
  if (e.altKey) { 
    $('body').toggleClass('shift');
  } 
});

$('tr.new.cert').each(function(){
  var $tr = $(this);

  $tr.find('td.name input').on('blur', function(e){
    console.log('blur')
    var name = $(this).val();
    if (name != "") {
      $tr.addClass('ready');
      $tr.find('td.name a').text(name);
      $tr.find('td.crt a').attr('href', '/' + name + '.crt');
      $tr.find('td.key a').attr('href', '/' + name + '.key');
      $tr.find('td.pub a').attr('href', '/' + name + '.pub');
      $tr.find('td.sub a').attr('href', '/' + name + '.sub');
      $tr.find('td.p12 a').attr('href', '/' + name + '.p12');
      $tr.find('td.tun a').attr('href', '/' + name + '.tun.ovpn');
      $tr.find('td.tap a').attr('href', '/' + name + '.tap.ovpn');
      $tr.find('td.zip a').attr('href', '/' + name + '.zip');
    } else {
      $tr.removeClass('ready');
      $tr.find('td a').attr('href', '');
    }
  });

  $tr.find('td.name input').keyup(function(e){
    if(e.keyCode == 13) {
      var name = $(this).val();
      if (name != "") {
        window.location.href = '/' + name + '.zip'
      } else {
        $tr.find('td a').attr('href', '');
      }
    }
  });

  $tr.find('td.name a').on('click', function(e){
    $tr.removeClass('ready');
    $tr.find('td.name input').focus();
  });

});


$('form.revoke').each(function(){
  var $form = $(this);
  var $select = $form.find('select'); 

  $form.find('button').on('click', function(e) {
    if ($select.val() != "") {
      var action = "/" + $select.val() + '.crt';
      $form.attr('action', action);
      $form.submit();
    }
  });

});


$('tr.cert td a[href]').click(function(e) { 
  if ($('body').hasClass('shift')) { 
    e.preventDefault();
    var $td = $(this).closest('td');
    if (($td.hasClass('pub')) || ($td.hasClass('sub')) || ($td.hasClass('p12')) || ($td.hasClass('tun')) || ($td.hasClass('tap')) || ($td.hasClass('zip'))) {
      $.post($(this).attr('href'), function(response) {
        $td.addClass('deleted');
        alert(response);
      });
    } else if ($td.hasClass('name')) {
      if (confirm("Are you sure you want to revoke this certificate?")) {
        $.post($(this).attr('href'), function(response) {
          $td.closest('tr.cert').remove();
          alert(response);
        });
      }
    }
  }
});

