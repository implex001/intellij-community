import { FList } from '../utils/FList';
import { TextRange } from '../utils/TextRange';
import { MinusculeMatcher } from './MinusculeMatcher';
import { MatcherWithFallback } from './MatcherWithFallback';

export class PinyinMatcher extends MinusculeMatcher {
  public static readonly BASE_CODE_POINT = 0x3400;
  public static readonly BASE_CHAR = '!'.charCodeAt(0);

  public static readonly ENCODING =
    'a,b,c,d,e,f,g,h,j,k,l,m,n,o,p,q,r,s,t,w,x,y,z,ab,ad,ae,ag,ah,aj,ak,al,an,ap,aq,at,aw,ax,ay,az,bc,bd,b' +
    'e,bf,bg,bh,bj,bk,bl,bm,bn,bp,bq,bs,bt,bx,by,bz,cd,ce,cf,cg,ch,cj,ck,cl,cm,cn,cp,cq,cr,cs,ct,cw,cx,cy,' +
    'cz,de,df,dg,dh,dj,dl,dm,dn,dq,dr,ds,dt,dw,dx,dy,dz,eg,eh,ej,ek,el,en,eo,ep,eq,er,es,et,ew,ex,ey,ez,fg' +
    ',fh,fj,fk,fl,fm,fn,fp,fq,fr,fs,ft,fw,fx,fy,fz,gh,gj,gk,gl,gm,gn,gp,gq,gr,gs,gt,gw,gx,gy,gz,hj,hk,hl,h' +
    'm,hn,ho,hp,hq,hr,hs,ht,hw,hx,hy,hz,jk,jl,jm,jn,jp,jq,jr,js,jt,jw,jx,jy,jz,kl,km,kn,ko,kq,kr,ks,kt,kw,' +
    'kx,ky,kz,lm,ln,lp,lq,lr,ls,lt,lw,lx,ly,lz,mn,mp,mr,ms,mt,mw,mx,my,mz,nq,nr,ns,nt,nw,nx,ny,nz,oq,os,ow' +
    ',ox,oy,pq,ps,pt,pw,px,py,pz,qr,qs,qt,qw,qx,qy,qz,rs,rt,rw,rx,ry,rz,st,sw,sx,sy,sz,tw,tx,ty,tz,wx,wy,w' +
    'z,xy,xz,yz,abd,aek,aen,aex,aey,agh,agq,agw,agy,ahj,ahk,ahq,ajn,ajx,akz,any,aoy,aqy,ast,asx,awy,bcp,bc' +
    't,bfh,bfp,bfy,bgh,bhp,bjx,blp,bmp,bps,bpt,bpz,btx,cdj,cdq,cds,cdt,cdx,cdy,cdz,ceh,ceq,cez,cgh,cgl,cgq' +
    ',cgz,chj,chx,chy,chz,cjq,cjr,cjs,cjt,cjw,cjx,cjz,clx,cnt,cnx,cnz,cox,cps,cqs,cqt,cqx,cqy,cqz,cst,csx,' +
    'csy,csz,cty,ctz,cwz,cxy,cxz,cyz,dgj,dgk,dgz,dhk,djs,dkq,dlt,dlx,dly,dmt,dnq,dnr,dnt,dnx,dps,dqx,dqz,d' +
    'ry,dst,dsw,dsy,dsz,dtw,dtx,dty,dtz,dwz,dxy,dxz,dyz,egh,egl,egw,ehw,ehz,ejq,ekq,emn,enr,eqw,ewy,exy,fg' +
    'j,fgz,fjn,fmw,fmz,fpw,fsx,ghj,ghk,ghl,ghn,ghq,ghs,ghw,ghx,ghy,gjk,gjl,gjq,gjr,gjx,gkl,gkn,gkq,gkt,gkw' +
    ',glw,glx,gly,gny,gqw,gqx,gqy,gqz,gst,gtx,gty,gwy,gxy,gyz,hjk,hjn,hjq,hjx,hjz,hko,hkq,hkt,hkx,hky,hly,' +
    'hms,hmw,hnt,hpt,hpx,hqx,hqy,hrs,hry,hst,hsw,hxy,jkq,jkx,jky,jkz,jlm,jln,jlp,jlx,jnp,jny,jpx,jqs,jqx,j' +
    'qy,jqz,jst,jsx,jsy,jsz,jtz,jxy,jxz,jyz,klw,koq,kqs,kqx,kqy,ksz,kxy,lmp,lmy,lnx,lpx,lqs,lqx,lrs,lsx,ls' +
    'y,ltx,ltz,lxz,mnw,mnx,mnz,mow,mqx,msy,mtx,nqx,nrs,nrw,nrx,nrz,nsz,ntx,nwz,nxy,psx,psy,pyz,qst,qsx,qsy' +
    ',qsz,qtx,qtz,qxy,rst,rsx,rtz,stx,sty,stz,swy,sxy,sxz,syz,twz,txy,tyz,wxy,xyz,achy,acsy,aghk,ajqy,bcpz' +
    ',bdsz,bflp,cdnq,cdqz,cdst,cdtx,cdtz,chqz,cjnt,cjqz,cjsx,cjxz,cqtz,csty,dgkt,dgyz,dlsy,dqsx,dqty,dqtz,' +
    'dsty,dstz,dsyz,dtxy,dtxz,dtyz,egqy,ehkw,ejwy,enyz,foqx,ghjk,gkoq,hjkq,hmtw,hswx,hsxy,hwxy,jlqy,jlqz,j' +
    'lxy,jlyz,jsty,jsyz,klxy,ksyz,nsyz,qsyz,stxz,bcjxz,bjlmx,cdstz,djstz,dltyz,dqxyz,ghkwx,cdjstyz,gjklqyz';

  public static readonly DATA =
    '03  *46     6         5     #    -  u   55 5++5657$4/1 ,e6\u0117-#&   7&!47 7$260\u00D0+-72   5  2)$-' +
    '2k+6"   +,6+)6+#   (5(1 7 (536(),+367767%10#4(3220+2  \u00AD/3\u017B6.3 ,\u0113$6\u00E4)-56  #&++ + ' +
    ')    0 #+\', \'2  ,,02+ 4*$73  "($\'# 0)+5 -5 ")2 \' 650/$\u008D+\u00A403"\'#\u00C5+  2$+(\u0109/$1%06|' +
    '\u014E\u00C0 ##j +$+\u00C5257  7|\u00BCll5+ #5) ) K#") "+* \u00B8"\u00C5+5S6+"%+  #-\u010B(6 \'65\'' +
    '+3+2 26\u00C57 0\u010157)(+6*&0! *#5#4  (26 )752 2*2(\u009D602(5&/$&\u00A6!&-\u00E56\u00B9 #\'-\u00B2+' +
    '&5/ 2  ++6( 50%  5    -453(3\u00ED-67     42-603()$\u00B7+\u00C2\u01A1+ 3+      \'6\u0109\u00ED\u0094#' +
    '\u00E9$7%\u01156%2\u00B7*(\'\u0115,\u0081\u00BC(7  4 "!70\'$"\"\u0157+55     p3#\u009F+|E5 075  #)(x6' +
    '5/2   \'655\u00B876# +531\u00EE7\u01155))( /+ +2\u00AE60 6(*#-( "54\u01154605-"()D!  73) 7")!7#&   ' +
    ' -\u00BC,y""" #53l  $4&$66*\u00B7* 46+5"#5-+67,75\'5 )+6)6 $65(6\u00AD#337",\u009F#+ 5 50-6 +&7 \'' +
    '*$(* \'3 2+\u00ED&\u00AB0\u012F)*5\u011572#5)\u00EC5666621(2)6 5S0Z "$\u010C% \u00D46) 05/#/-)6%$   $' +
    '  \u0100+02#$5\u0094\u008B2\u0212/\u0100\u011056"+    6+3+,0765+52\u0197 4&6-#3)2/!*g 57  &+55,\u00B9' +
    ',676\u01A93562&6$ +#g\u014D+2-!Fe ## 1\u00EB,56-!2,  +5674(,-4\u00E5-07+77(5(\u01007, #\' #+72+)5$)1, *' +
    '6-6+6662 +6,,766\',)4 *$+ 5#0,,0 49! "-+)6#7"(63)!+)4"75\u00BE6 S\u00C7)45\u00C065#0$-\u0102)3 2$+7' +
    '  k#)(7+-)0$ )5#6$b ,(2*7(#5-#+!,256(#0+&$,+3(,"00( +"3707,/75\' 0 + 6%$,402,3 ,6)+*\'6$ ++\u0102!"6' +
    ',$ ! 5&$)130%0))()7","46!6($4-# ++-(+ +&,6 )  7\u00A36 \u00C0" 1(&\'*)\u00E2 236l"*+(5- \u00C7\u00E4' +
    '50F,  \u0219 \u00C07*46#3+"\',5&+77#,+ 6/7\u00C0+-6 ))|6)(7++7"l)$+675##g\u0181+$+# x#F# 67\u0110 3#' +
    '67 S0+0+\u0101*26#)) ) $ )($  ( #s" 5+ \u010B" " 51"%) 7"%607,62   23,)"1##$    |x\u00B652$53 3' +
    '2)746  (|07 5574  37-  561\u00EA#| ,)&/\u0125&!0\u01015&\'0\'3#6\'"&d7 7 (-)#\u0141*++6 6(+(\'*6$( \')7n0' +
    '"\u013D#,(5\u00C0(  #\u01096|$3,+23#$#/6))+36 #06+#   6\u00BB4,255#\u00C0( 602\u010A$+ /3l62&g6\u0110' +
    '(\u00FD6,&( 6l-!&+##,Z\u00B8+ 6(7\u00B8%(\u010B-\u00B8+\u01066+,)) "6\u00B8,#, +)4655#+657++0()4  \'7' +
    '{6)615266\u00B3)\u00B33\u00C20s),6\u01A2S5,K\u0101\'2(6\'\'+%\u00C77"4 +  * \u00B767#5\u00B8 0/\u00A8\u0086' +
    '\'0(++#2Y\u0089/*3/33|"\'( "7$Z\u0111\u00E9+/)\u00E4\u017F#\'"13"7*+(67)55\u010B2052(,(/ (-2"a)(+ (' +
    '$(\'6#\u009E))$,\u00B8,\u0162+/6))0 02 \u00C7\u00BA6\u01705\u010B&#6 $ 0(3 05-2,3+(#7A+, & 5"(05  "' +
    '0/))*2\u00C0%-0$$ \u00A47\u0143\u0102*6\u00CC*(& $5\'(0(3"\u00EA"+6-#2Z+3+*27Z+, \u00C0*2\u0100"765' +
    '2221l++# (  )"($ +))*2\u00A07$$76/#    \u008B  6\u009D66\u010D\'0\'  (,&(\'3$ 6  0 #,3"!  5   ,+-"# &' +
    '7))2 *$+    63#,,(4-(()"5+\u00C7 ,/(6 524#5)g(&2+ $0S6" ($6))-+6334(5( 37 (&  3 1) 5  6)( ", \'4 ,2' +
    '"+0  \u009D7+S1\u00F0+\'555 -   5+&#7"7|7() )   35F33$)!(5)\u0105"7-3-  6,  -2e6\'h1)0,%+k7()\u00CA ' +
    '\'(\' K24)50\u01CB45)(/2#7 72)27"   +"5/$07Sg"2((\u00C6#)-'&  x#5$5*73(#+)+0/7 +l0  3+0++2\u01697/)0' +
    '  7/)")\' "7+++2,)|" + 5/0+7 )25 5 +06-+6 6#\u00C0(5*7\u00B3\u00B80(5(\'#552\u01C2\u01CB2\u01156/7\u00F4' +
    '7+\u00B85\u01D1\u00FD6)5#\u00CE*6\u00AF65\u010B)660k+*7    5 #5!\u00A9#H7 \u00DD/\u009F2+35+0\u0113+$' +
    ',+4$*!7(6,7&S "+++(\u0102\u009F\u00B3l\u00D3#)\u00BB)+ \u010901#-7+/  T\u01035+5&0 2731\u010D6,-" 2' +
    '3(21 $/)3 1-+$|7 +$5\')-k\u00E964\'76#5)3&/ \u011706""276" $+6##5565   3\'   +5f)3/755-     ,)\u00E9\u024C' +
    '(467X,05&63+6 )\u00E26) 2  -4,262\u021D)+6,727"+       0\'576-\u00C65657- 2+#,\u00B3$2   25"$7 22\u00B9' +
    '3\'   -,5,)#)(\u01302#2-/,    6# *"+*2"2\u00AAS6\u0115-67#&5/4+#\u00C77"6\u00AF/5 +\u00C05)\u009D  ' +
    '65l(65  +5(6 +\u0109#")2&$ "6  -+6p k#\')-   +,6 +( 6)#1-  (3 E'""0 2#(#&\u009D%4&3 +(6( 67607)3  ' +
    '    3+)75\u00B8 5   #0, 7"a  6\',"$)\u010D 46 )53( $))*7 5+&(5-,1#\u00C6, )0347+2*\u00D17732"6/#\u00AC' +
    '*)!#0""&*337+ \'62\u01C0+22 "1$"+0&)7(\u00AC+\u011365g$+)#2/6)((31461626\u00BB35\u009E707$ 6  626,' +
    '  054\'632-\'34)#\u00BF7\u00B0-\u00AA\'6( 2#(645/1+\u00D92\u02037(K(#7 37-(676+(55#+ 2\u00C0/0\'76  1-,"' +
    ') 5/",    66 /0"(   ",+34++ ))7$)$"     +"23z     $  2"32#3,)+  7")75+  \u010B62  %    0+73\u00A5' +
    '6+"-/+3+4$+347\'5!&S"326"0\u00CF\'3(g)(5$e$/\u00C1+2.$6l1\u00AD3#/g+\u01117+2/2 $(655++ \u010F\' 3   ' +
    '6- \')#\u00A44+++5"!6)157##76\u00941 52\u00BE\u00C557  2#&)7 \'4 02(3Z71,&+\u014F55-\u0115\u00C6+p16+2' +
    '++\'5500#6"*0!00#/\u00C8\u0129\'2/ 7(\u00B6("  7)\'5\'l,l3\u0111\u00DC+   |!5\'5 3#25)&0 6\u0141)+6+36/+' +
    '+" ,"( 6(#(-#+3(""a6$85 7$1"#\u00E43"\'6576&6!3,2)\')0)65*,5240(173\u00C5\u00C50!\u00E4\' 3&)\u013E' +
    '2Q,2\'(\u009D+(\u00C30\'(" \'&,!\u00D22+)#\u0255h/f6$$ +5"5,6,004\u01166\u00CCh666\u00C7\u00C7\u00B8,**' +
    '66\u00FD\'(62#+ 5#\u014C-0,(67\u00AF#"05)*,,\u010DM)\u00C4-"\u010C\u00D9,+,,5#0)(55-3(6 #"l$7)0 5(2' +
    '* $66")7)2$$#&,77 \u0101u(\'0+\'+1&#6\')\'\'2\u00D07-$+3#6\'  $ ,),)6\u0117775 S(\'\u00B3+4Y*+l+602 5\u00C0' +
    '0(2#$+ -3$\u01E9\'$+#5/+7-\u009D6\u00C5+," \u0194"&(6+66)(#z% 6l7060(-()2  /,#+a# #2$0 +++166$06-&)6' +
    '&15  "2/-\u0111h3316+!(\u00C0+\u00A87266#4)36()1,)7)F2+(0#\u013E*-#35)(0\u009E,6 \u01023 !/#3%(0l27-' +
    'h\u010D+Q+,\u00A9e(,\'+$77  7"b0 +5&\'#)\u0086#6(6\u01176x76\u01166>(+6#  2 -,(#65)763*0 #)57h/0 0+612' +
    '02 & ,(  (0e0$+S)5\u00D5 67(6 70 \')77\u009F-17F\u00C7\u00A96#)\u0162+117-#  6\u00C4"h)$4676 2+/7(6$7' +
    'K\u00FD+30,6K\'\'\u00D5\u00A4 \u0254*2#73*05$l\u00B9g\u010B70)74  5-/\u00B5)723S3041+(27/,)2,2++)+7$ 2\u009D' +
    '&,2)35*4&+##+6#6,F76$(4325220+6 ++&++5\u00C5.,51726"+(0+""(( g/0,\u00C0",24  +0 (5 26 -()6 235l,5' +
    ', (x56"+&+##Z$*#5#,007   (\'#\u009E,"(\'6,4   \u00E957,) 776+ 7"16 #%6,0 4)" "\u00946+&0&%%736)0)+' +
    '#" -65,5& -\u0110"\u00EF4*6.\u010B\'3\'(3 6$0)+,,)+&.,)&"(26-)+")3+7\u010D6$##,6+#)2\u00A4-+ 2+7 #))' +
    '%61#1&+266$+73/7)#"*j ((,(\'$&5,,+\'7367++4+)++ \u0094643/ 7\' 5-\u014D47$4" (5l+6(5("1\u010F/+765\u00D6' +
    '*# -(#+73&(702/\' (# %\u0082102) 6SF7-#"#3(7"74\u00A6"%74477+4\'0+72,|0#/+2+2\u01016&5)$/\'\u02071\u0117' +
    '\'/\u0182b#(7,"\u00D72")2 \u00A7cp5%5, 571)x72,"(6j/-lS 0)|+\u00C7\u00B85#i7\u00EF\u00AD#3#$g0771"' +
    ')5|)\')$#21\u00A9(0l2#4*\u00AD\u00A4\u009F&##|#+5776\'\u009D\u01E0$\u009D\u010B3\'5,$!/4!,\u00FA,67"641' +
    '+6#\u00B37/ 3&2 $#\u01043#3)2(+  #)\u0087\'&$ %"\u0110$ $";

  private static final int END_CODE_POINT = BASE_CODE_POINT + DATA.length();

  private static final String[] ENCODING_ARRAY = ENCODING.split(",");

  private final String myPattern;

  PinyinMatcher(String pattern) {
    myPattern = pattern;
  }

  @Override
  public @NotNull String getPattern() {
    return myPattern;
  }

  @Override
  public FList<TextRange> matchingFragments(@NotNull String name) {
    String pattern = myPattern;
    int patternLength = pattern.length();
    int nameLength = name.length();
    int maxOffset = nameLength - patternLength;
    int start = 0;
    for (; start <= maxOffset; start++) {
      char c = name.charAt(start);
      if (c >= BASE_CODE_POINT && c < END_CODE_POINT) {
        break;
      }
    }
    OUTER:
    for (int end = start + patternLength; start <= maxOffset && end <= nameLength; start++, end++) {
      for (int i = start; i < end; i++) {
        char c = name.charAt(i);
        if (c < BASE_CODE_POINT || c >= END_CODE_POINT) {
          continue OUTER;
        }
        int code = DATA.charAt(c - BASE_CODE_POINT) - BASE_CHAR;
        if (code < 0 || ENCODING_ARRAY[code].indexOf(pattern.charAt(i - start)) == -1) {
          continue OUTER;
        }
      }
      return FList.singleton(TextRange.create(start, start + patternLength));
    }
    return null;
  }

  @Override
  public int matchingDegree(@NotNull String name,
                            boolean valueStartCaseMatch,
                            @Nullable FList<? extends TextRange> fragments) {
    if (fragments != null && fragments.size() == 1) {
      TextRange range = fragments.getHead();
      if (range.getStartOffset() == 0) {
        return 500 + range.getLength();
      }
      String prefix = name.substring(0, range.getStartOffset());
      if (prefix.equals("get") || prefix.equals("is") || prefix.equals("set")) {
        return 200 + range.getLength();
      }
      return range.getLength();
    }
    return Integer.MIN_VALUE;
  }

  static MinusculeMatcher create(MinusculeMatcher delegate) {
    String pattern = delegate.getPattern();
    if (pattern.startsWith("*")) {
      pattern = pattern.substring(1);
    }
    if (pattern.isEmpty()) return delegate;
    for (int i = 0; i < pattern.length(); i++) {
      char c = pattern.charAt(i);
      // Pinyin initials are always lowercase English letters and never include i, u, or v
      if (c < 'a' || c > 'z' || c == 'i' || c == 'u' || c == 'v') return delegate;
    }
    return new MatcherWithFallback(delegate, new PinyinMatcher(pattern));
  }
}
