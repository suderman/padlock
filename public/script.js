// Toggle shift classname when holding shift key
$(document).on('keyup keydown', function(e) {
  if (e.shiftKey) { 
    $('body').addClass('shift');
  } else { 
    $('body').removeClass('shift');
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
      $tr.find('td.ovpn a').attr('href', '/' + name + '.ovpn');
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
      var action = "/" + $select.val() + '.zip';
      $form.attr('action', action);
      $form.submit();
    }
  });

});
