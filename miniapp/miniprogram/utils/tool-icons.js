// Small, consistent line icons; encoded SVGs render without a request or font.
const shapes={
 edit:'<path d="m21 5 6 6M7 25l5-1 15-15a3 3 0 0 0-6-6L6 18l-1 8zM18 27H9"/>',
 reset:'<path d="M6 11a11 11 0 1 1-1 10M6 4v7h7"/>',
 calculator:'<rect x="6" y="3" width="20" height="26" rx="4"/><path d="M10 8h12v5H10zM11 18h1m8 0h1m-10 6h1m8 0h1"/>',
 records:'<path d="M7 4h14l5 5v19H7zM21 4v6h5M11 15h11M11 20h6M11 25h9"/>',
 home:'<path d="m5 14 11-9 11 9M8 12v14h16V12M13 26v-8h6v8"/>',
 employee:'<rect x="6" y="7" width="20" height="22" rx="4"/><path d="M13 4h6v6h-6zM12 24c0-5 8-5 8 0"/><circle cx="16" cy="16" r="3"/>',
 flexible:'<path d="M11 11V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3"/><rect x="4" y="11" width="24" height="17" rx="4"/><path d="M4 17c7 5 17 5 24 0M14 18h4v5h-4z"/>',
 resident:'<path d="m3 13 13-9 13 9M7 11v16h18V11M12 27v-7a4 4 0 0 1 8 0v7"/><circle cx="16" cy="13" r="2.5"/>'
};
function icon(id,color='#2463eb'){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(shapes[id]||shapes.home)+'</svg>');}
module.exports={icon};
