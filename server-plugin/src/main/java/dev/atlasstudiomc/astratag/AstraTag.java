package dev.atlasstudiomc.astratag;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.plugin.messaging.PluginMessageListener;
import org.bukkit.scoreboard.Scoreboard;
import org.bukkit.scoreboard.Team;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * Puts a tag in front of a player's name - above their head and in the tab list -
 * for everyone on the server, including players on other clients.
 *
 * A player gets the tag when their client reports itself as Astra (the client sends
 * its name on the MC|Brand channel when it joins), or when an admin grants it manually.
 */
public class AstraTag extends JavaPlugin implements Listener, PluginMessageListener {

    private static final String TEAM = "astra_tag";
    private final Set<String> tagged = new HashSet<>();   // lowercase names with the tag
    private String prefix;
    private String brandMatch;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        loadSettings();
        getServer().getPluginManager().registerEvents(this, this);
        // 1.8 clients send their name here; newer servers also expose Player#getClientBrandName()
        try {
            getServer().getMessenger().registerIncomingPluginChannel(this, "MC|Brand", this);
            getServer().getMessenger().registerIncomingPluginChannel(this, "minecraft:brand", this);
        } catch (Throwable ignored) {
            // older/newer servers may not have both channels; whichever registers is enough
        }
        for (Player p : Bukkit.getOnlinePlayers()) checkBrandLater(p);
    }

    @Override
    public void onDisable() {
        for (Player p : Bukkit.getOnlinePlayers()) removeTag(p);
    }

    private void loadSettings() {
        reloadConfig();
        prefix = ChatColor.translateAlternateColorCodes('&', getConfig().getString("prefix", "&b[A] &r"));
        brandMatch = getConfig().getString("brand-contains", "astra").toLowerCase();
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        if (e.getPlayer().hasPermission("astratag.always")) {
            giveTag(e.getPlayer());
        }
        checkBrandLater(e.getPlayer());
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        tagged.remove(e.getPlayer().getName().toLowerCase());
    }

    @Override
    public void onPluginMessageReceived(String channel, Player player, byte[] message) {
        if (!channel.equals("MC|Brand") && !channel.equals("minecraft:brand")) return;
        String brand = new String(message, StandardCharsets.UTF_8).toLowerCase();
        if (brand.contains(brandMatch)) giveTag(player);
    }

    /** The brand arrives right after join, so look again a moment later too. */
    private void checkBrandLater(final Player player) {
        Bukkit.getScheduler().runTaskLater(this, new Runnable() {
            @Override
            public void run() {
                if (!player.isOnline()) return;
                String brand = clientBrand(player);
                if (brand != null && brand.toLowerCase().contains(brandMatch)) giveTag(player);
            }
        }, 40L);
    }

    private String clientBrand(Player player) {
        try {  // only exists on newer server versions
            return (String) Player.class.getMethod("getClientBrandName").invoke(player);
        } catch (Throwable ignored) {
            return null;
        }
    }

    public void giveTag(Player player) {
        if (!tagged.add(player.getName().toLowerCase())) return;
        Scoreboard board = Bukkit.getScoreboardManager().getMainScoreboard();
        Team team = board.getTeam(TEAM);
        if (team == null) team = board.registerNewTeam(TEAM);
        if (!team.getPrefix().equals(prefix)) team.setPrefix(prefix);
        team.addEntry(player.getName());
        // tab list shows the prefix too on servers that do not read the team prefix there
        player.setPlayerListName(prefix + player.getName());
    }

    public void removeTag(Player player) {
        tagged.remove(player.getName().toLowerCase());
        Scoreboard board = Bukkit.getScoreboardManager().getMainScoreboard();
        Team team = board.getTeam(TEAM);
        if (team != null) team.removeEntry(player.getName());
        player.setPlayerListName(player.getName());
    }

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (args.length == 0) {
            sender.sendMessage(ChatColor.AQUA + "/astratag reload | check <player> | give <player> | take <player>");
            return true;
        }
        if (args[0].equalsIgnoreCase("reload")) {
            loadSettings();
            sender.sendMessage(ChatColor.GREEN + "AstraTag reloaded. Prefix: " + prefix + ChatColor.GREEN + "(brand contains \"" + brandMatch + "\")");
            return true;
        }
        if (args.length < 2) {
            sender.sendMessage(ChatColor.RED + "Name a player.");
            return true;
        }
        Player target = Bukkit.getPlayerExact(args[1]);
        if (target == null) {
            sender.sendMessage(ChatColor.RED + "That player is not online.");
            return true;
        }
        if (args[0].equalsIgnoreCase("check")) {
            String brand = clientBrand(target);
            sender.sendMessage(ChatColor.AQUA + target.getName() + ChatColor.GRAY + " client: "
                    + (brand == null ? "unknown (server cannot read brands)" : brand)
                    + ", tagged: " + tagged.contains(target.getName().toLowerCase()));
        } else if (args[0].equalsIgnoreCase("give")) {
            giveTag(target);
            sender.sendMessage(ChatColor.GREEN + "Tagged " + target.getName());
        } else if (args[0].equalsIgnoreCase("take")) {
            removeTag(target);
            sender.sendMessage(ChatColor.GREEN + "Removed tag from " + target.getName());
        }
        return true;
    }
}
