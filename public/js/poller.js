function refresh() {
	refresh_status_payload()
	
	setTimeout(refresh, 2500);
}
function refresh_status_payload() {
	$.ajax({
       url: "/api/header"
    }).done(function( data ) {
       //console.log( "Sample of data:", data );
       $('#header').html(data.message);
    });
	
	var standings_list = document.getElementById('standings_list');
	var standings_header = document.getElementById('standings_header');
	var standings_div = document.getElementById('standings_div');
	var options_div = document.getElementById('options_div');
	
	$.ajax({
       url: "/api/options"
    }).done(function( data ) {
		//console.log( "data:", data );
		if (data.break.text) {
			//console.log("exei text");
			standings_list.innerHTML = '';
			standings_header.innerHTML = '';
			standings_header.hidden = true;
			standings_div.hidden = true;
			options_div.hidden = false;
			
			var list_c = document.getElementById('list_c');
			list_c.innerHTML = '';
			var list_b = document.getElementById('list_b');
			list_b.innerHTML = '';
			var list_s1 = document.getElementById('list_s1');
			list_s1.innerHTML = '';
			var list_m = document.getElementById('list_m');
			list_m.innerHTML = '';
			var list_s2 = document.getElementById('list_s2');
			list_s2.innerHTML = '';
			var list_s3 = document.getElementById('list_s3');
			list_s3.innerHTML = '';
			var list_s4 = document.getElementById('list_s4');
			list_s4.innerHTML = '';
			var list_s5 = document.getElementById('list_s5');
			list_s5.innerHTML = '';
			var list_s6 = document.getElementById('list_s6');
			list_s6.innerHTML = '';
			var list_r = document.getElementById('list_r');
			list_r.innerHTML = '';
			
			let listItem;
			
			for (const element of data.c_opts) {
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = element.text;
				listItem.className  = element.style;
				// Add listItem to the standings_list
				list_c.appendChild(listItem);
			}
			
			listItem = document.createElement('li');
			// Add the item text
			listItem.innerHTML = data.break.text;
			listItem.className  = data.break.style;
			// Add listItem to the standings_list
			list_b.appendChild(listItem);

			if(data.s_opts[0]){
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = data.s_opts[0].text;
				listItem.className  = data.s_opts[0].style;
				// Add listItem to the standings_list
				list_s1.appendChild(listItem);
			}
			
			for (const element of data.m_opts) {
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = element.text;
				listItem.className  = element.style;
				// Add listItem to the standings_list
				list_m.appendChild(listItem);
			}
			
			if(data.s_opts[1]){
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = data.s_opts[1].text;
				listItem.className  = data.s_opts[1].style;
				// Add listItem to the standings_list
				list_s2.appendChild(listItem);
			}
			if(data.s_opts[2]){
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = data.s_opts[2].text;
				listItem.className  = data.s_opts[2].style;
				// Add listItem to the standings_list
				list_s3.appendChild(listItem);
			}
			if(data.s_opts[3]){
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = data.s_opts[3].text;
				listItem.className  = data.s_opts[3].style;
				// Add listItem to the standings_list
				list_s4.appendChild(listItem);
			}
			if(data.s_opts[4]){
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = data.s_opts[4].text;
				listItem.className  = data.s_opts[4].style;
				// Add listItem to the standings_list
				list_s5.appendChild(listItem);
			}
			if(data.s_opts[5]){
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = data.s_opts[5].text;
				listItem.className  = data.s_opts[5].style;
				// Add listItem to the standings_list
				list_s6.appendChild(listItem);
			}
			
			for (const element of data.r_opts) {
				listItem = document.createElement('li');
				// Add the item text
				listItem.innerHTML = element.text;
				listItem.className  = element.style;
				// Add listItem to the standings_list
				list_r.appendChild(listItem);
			}
			
		} else {
			standings_header.hidden = false;
			standings_div.hidden = false;
			options_div.hidden = true;
			$.ajax({
				url: "/api/standings"
			}).done(function( data2 ) {
				//console.log( "Sample of data:", data2 );
				//$('#holder').html(data2.message);
				const myArr = JSON.parse(data2);
				let listItem;
				
				standings_list.innerHTML = '';
				standings_header.innerHTML = 'Current standings:';
				
				for (const element of myArr) {
					listItem = document.createElement('li');
			
					// Add the item text
					listItem.innerHTML = element[0] + " (" + element[1] + "pts)";
			
					// Add listItem to the standings_list
					standings_list.appendChild(listItem);
				}
		
			});
		}
    });
}
