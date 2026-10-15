package com.nextplay;

import com.google.gson.Gson;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import javax.inject.Inject;
import javax.swing.*;
import net.runelite.api.*;
import net.runelite.api.events.*;
import net.runelite.client.RuneLite;
import net.runelite.client.callback.ClientThread;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.ui.PluginPanel;

/** Development source only. Seek Plugin Hub review before distribution. No combat overlay or input automation. */
@PluginDescriptor(name="NextPlay Recorder (Development)", description="Export your own observations for post-session review", enabledByDefault=false)
public class NextPlayPlugin extends Plugin {
    @Inject private Client client;
    @Inject private ClientThread clientThread;
    @Inject private ClientToolbar toolbar;
    @Inject private Gson gson;
    private NavigationButton navigation;
    private final JLabel status=new JLabel("Ready. Exports stay on this computer.");
    private List<Map<String,Object>> events=new ArrayList<>();
    private boolean recording;
    private long startNanos;
    private int startTick;
    private String startedAt;
    private String lastProtection;
    private Player lastTarget;
    private String lastTargetProtection;

    @Override protected void startUp(){
        PluginPanel panel=new PluginPanel(); panel.setLayout(new BorderLayout(0,12));
        JButton start=new JButton("Start recording observations");
        JButton stop=new JButton("Stop & export");
        JPanel buttons=new JPanel(new java.awt.GridLayout(0,1,0,8));
        buttons.add(start);buttons.add(stop);buttons.add(status);panel.add(buttons,BorderLayout.NORTH);
        start.addActionListener(e->clientThread.invoke(()->begin()));
        stop.addActionListener(e->clientThread.invoke(()->finish("unknown")));
        BufferedImage icon=new BufferedImage(32,32,BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g=icon.createGraphics();g.setColor(new Color(193,242,110));g.fillRoundRect(1,1,30,30,8,8);g.setColor(Color.BLACK);g.drawString("N",12,21);g.dispose();
        navigation=NavigationButton.builder().tooltip("NextPlay recorder").icon(icon).panel(panel).build();toolbar.addNavigation(navigation);
    }
    private void begin(){
        if(recording)return;
        if(client.getGameState()!=GameState.LOGGED_IN){message("Log in before starting observations.");return;}
        events=new ArrayList<>();startNanos=System.nanoTime();startTick=client.getTickCount();startedAt=Instant.now().toString();recording=true;
        lastProtection=activeProtection();lastTarget=null;lastTargetProtection=null;
        recordItems("inventory",client.getItemContainer(InventoryID.INVENTORY));
        recordItems("equipment",client.getItemContainer(InventoryID.EQUIPMENT));
        message("Recording your observations. No live coaching.");
    }
    private double seconds(){return Math.round((System.nanoTime()-startNanos)/1e7)/100.0;}
    private Map<String,Object> event(String kind){Map<String,Object> e=new LinkedHashMap<>();e.put("t",seconds());e.put("tick",Math.max(0,client.getTickCount()-startTick));e.put("kind",kind);e.put("source","observed");return e;}
    private String activeProtection(){
        // RuneLite's legacy prayer method is reliable for these three defensive prayers.
        if(client.isPrayerActive(Prayer.PROTECT_FROM_MELEE))return "melee";
        if(client.isPrayerActive(Prayer.PROTECT_FROM_MISSILES))return "ranged";
        if(client.isPrayerActive(Prayer.PROTECT_FROM_MAGIC))return "magic";
        return "none";
    }
    private String targetProtection(Player target){
        HeadIcon icon=target.getOverheadIcon();
        if(icon==null)return "none";
        switch(icon){case MELEE: return "melee";case RANGED: return "ranged";case MAGIC: return "magic";default: return null;}
    }
    private Player interactingPlayer(){
        Player self=client.getLocalPlayer();
        Actor target=self==null?null:self.getInteracting();
        return target instanceof Player?(Player)target:null;
    }
    private void recordItems(String kind,ItemContainer container){
        if(!recording||container==null)return;
        List<Map<String,Integer>> items=new ArrayList<>();Item[] slots=container.getItems();
        for(int i=0;i<slots.length;i++){
            Item item=slots[i];if(item==null||item.getId()<=0||item.getQuantity()<=0)continue;
            Map<String,Integer> slot=new LinkedHashMap<>();slot.put("slot",i);slot.put("id",item.getId());slot.put("quantity",item.getQuantity());items.add(slot);
        }
        Map<String,Object> e=event(kind);e.put("items",items);events.add(e);
    }
    @Subscribe public void onGameTick(GameTick tick){
        if(!recording)return;
        if(events.size()>=9000){finish("unknown");return;}
        if(client.getGameState()!=GameState.LOGGED_IN||client.getLocalPlayer()==null)return;
        Map<String,Object> e=event("snapshot");e.put("hp",client.getBoostedSkillLevel(Skill.HITPOINTS));e.put("maxHp",client.getRealSkillLevel(Skill.HITPOINTS));e.put("prayerPoints",client.getBoostedSkillLevel(Skill.PRAYER));e.put("activeProtection",activeProtection());
        Player target=interactingPlayer();if(target!=null){String overhead=targetProtection(target);if(overhead!=null)e.put("targetProtection",overhead);}
        events.add(e);
    }
    @Subscribe public void onVarbitChanged(VarbitChanged changed){
        if(!recording||client.getGameState()!=GameState.LOGGED_IN)return;
        String protection=activeProtection();if(protection.equals(lastProtection))return;
        lastProtection=protection;Map<String,Object> e=event("prayer");e.put("activeProtection",protection);events.add(e);
    }
    @Subscribe public void onClientTick(ClientTick tick){
        if(!recording||client.getGameState()!=GameState.LOGGED_IN)return;
        Player target=interactingPlayer();String protection=target==null?null:targetProtection(target);
        if(target==lastTarget&&Objects.equals(protection,lastTargetProtection))return;
        lastTarget=target;lastTargetProtection=protection;
        if(protection!=null){Map<String,Object> e=event("targetOverhead");e.put("targetProtection",protection);events.add(e);}
    }
    @Subscribe public void onItemContainerChanged(ItemContainerChanged changed){
        if(!recording)return;
        if(changed.getContainerId()==InventoryID.INVENTORY.getId())recordItems("inventory",changed.getItemContainer());
        else if(changed.getContainerId()==InventoryID.EQUIPMENT.getId())recordItems("equipment",changed.getItemContainer());
    }
    @Subscribe public void onAnimationChanged(AnimationChanged changed){
        if(!recording||changed.getActor()==null)return;
        String role=changed.getActor()==client.getLocalPlayer()?"self":changed.getActor()==interactingPlayer()?"target":null;
        if(role==null)return;
        Map<String,Object> e=event("animation");e.put("actorRole",role);e.put("animationId",changed.getActor().getAnimation());events.add(e);
    }
    @Subscribe public void onHitsplatApplied(HitsplatApplied hit){
        if(!recording)return;
        if(hit.getActor()==client.getLocalPlayer()){
            // A hitsplat does not establish attack style or protection at evaluation.
            Map<String,Object> e=event("selfHit");e.put("amount",hit.getHitsplat().getAmount());events.add(e);
        }else if(hit.getActor()!=null&&hit.getActor()==interactingPlayer()){
            // A target hitsplat may be caused by another player; never label it as our outgoing attack.
            Map<String,Object> e=event("targetHit");e.put("amount",hit.getHitsplat().getAmount());events.add(e);
        }
    }
    @Subscribe public void onActorDeath(ActorDeath death){
        if(recording&&death.getActor()==client.getLocalPlayer()){events.add(event("death"));finish("loss");}
    }
    private void finish(String outcome){
        if(!recording)return;recording=false;
        Map<String,Object> session=new LinkedHashMap<>();session.put("version",1);session.put("game","osrs");session.put("mode","LMS");session.put("title","RuneLite observations "+startedAt);session.put("outcome",outcome);session.put("duration",seconds());session.put("events",new ArrayList<>(events));
        session.put("startedAt",startedAt);session.put("endedAt",Instant.now().toString());
        String json=gson.toJson(session);String name="session-"+UUID.randomUUID()+".json";
        CompletableFuture.runAsync(()->{try{Path dir=RuneLite.RUNELITE_DIR.toPath().resolve("nextplay");Files.createDirectories(dir);Path tmp=dir.resolve(name+".tmp"),target=dir.resolve(name);Files.write(tmp,json.getBytes(StandardCharsets.UTF_8));Files.move(tmp,target,StandardCopyOption.REPLACE_EXISTING);message("Exported to .runelite/nextplay/"+name);}catch(Exception ex){message("Export failed: "+ex.getClass().getSimpleName());}});
    }
    private void message(String value){SwingUtilities.invokeLater(()->status.setText(value));}
    @Override protected void shutDown(){finish("unknown");if(navigation!=null)toolbar.removeNavigation(navigation);}
}
